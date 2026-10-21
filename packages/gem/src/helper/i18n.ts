import type { RouteTrigger } from '../elements/base/route';
import type { UpdateHistoryParams } from '../lib/history';
import type { TemplateResult } from '../lib/lit-html';
import { html, UpdateToken } from '../lib/reactive';
import { isolate, isServer, ssrHooks } from '../lib/server';
import { GemError } from '../lib/utils';
import { logger } from './logger';

// Hello, $1
// See $1<detail>
// 嵌套模版中用到 $ < > 时使用 &dollar; &lt;  &gt;  替代
const splitReg = /\$\d(?:<[^>]*>)?/;
const matchReg = /\$(\d)(<([^>]*)>)?/g;
const matchStrIndex = 3;

export function splice(rawValue: string, ...rest: (((s: string) => TemplateResult) | string)[]) {
  const templateArr = rawValue.split(splitReg) as unknown as TemplateStringsArray;
  const values: (TemplateResult | string)[] = [];
  let result: RegExpExecArray | null;
  while ((result = matchReg.exec(rawValue))) {
    const str = result[matchStrIndex];
    const index = Number(result[1]) - 1;
    const arg = rest[index];
    values.push(typeof arg === 'function' ? arg(str) : arg);
  }
  return html(templateArr, ...values);
}

// 正在创建子模块，构造函数中用来区分主模块
let creatingSubModule = false;

type Msg =
  | {
      message: string;
      description: string;
    }
  | string;

type I18nJSON<T> = {
  currentLanguage: string;
  currentLanguagePack: Partial<T>;
};

/**
 * 语言包加载函数，例如 `() => import('./zh.json')`，打包时每个语言是单独的文件，只加载用到的语言
 *
 * 类型只从 `default` 推断，否则模块对象本身也会被推断成语言包
 */
type PackLoader<T> = () => Promise<{ default: Partial<T> } | NoInfer<Partial<T>>>;

interface Resources<T> {
  [key: string]: Partial<T> | PackLoader<T>;
}

interface I18nOptions<T> {
  resources: Resources<T>;
  fallbackLanguage: string;
  // 可以在构造函数中指定，但会被 URL 中的语言参数覆盖
  currentLanguage?: string;
  /**
   * 缓存用户选择的语言，`true` 表示在修改语言时自动缓存，`manual` 时调用 `setCache` 缓存
   *
   * 同时缓存加载函数加载的语言包，下次加载完成前先使用缓存，加载完成后更新
   */
  cache?: boolean | 'manual';
  // 缓存和 SSR 输出的 key，lib 需要设置，避免和应用中的 i18n 冲突
  cachePrefix?: string;
  // 为 `path` 时页面的路由不能和语言代码相同
  urlParamsType?: 'path' | 'querystring' | 'ccTLD' | 'gTLD';
  urlParamsName?: string;
  onChange?: (currentLanguage: string) => void;
}

export class I18n<T = Record<string, Msg>> implements RouteTrigger {
  resources: Resources<T>;
  fallbackLanguage: string;
  cache?: boolean | 'manual';
  cachePrefix = 'gem-i18n';
  urlParamsType?: 'path' | 'querystring' | 'ccTLD' | 'gTLD';
  urlParamsName?: string;
  onChange?: (currentLanguage: string) => void;

  // SSR 时每个请求使用独立的语言，`pending` 是正在切换的语言
  #state = isolate({ currentLanguage: '', pending: undefined as Promise<string> | undefined });

  // 子模块跟随主模块切换语言，不修改文档的语言，也不缓存语言，只缓存语言包
  #isSub = creatingSubModule;
  #subModules = new Set<I18n<any>>();

  get currentLanguage() {
    return this.#state.currentLanguage;
  }

  set currentLanguage(lang: string) {
    this.#state.currentLanguage = lang;
  }

  /** 等待切换语言完成，包括加载语言包和所有子模块，例如渲染刚加载的模块前 */
  get ready(): Promise<unknown> {
    return Promise.all([this.#state.pending, ...[...this.#subModules].map((i18n) => i18n.ready)]);
  }

  // 兼容 `<gem-route>`
  replace = ({ path }: UpdateHistoryParams) => this.setLanguage(path!);
  getParams = () => ({ path: this.currentLanguage });

  get #cacheKey() {
    return `${this.cachePrefix}:current`;
  }

  get #storeKey() {
    return `i18n:${this.cachePrefix}`;
  }

  get #urlParamsLang() {
    const { hostname, pathname, search } = location;
    const parts = hostname.split('.');
    switch (this.urlParamsType) {
      case 'ccTLD':
        return parts.pop();
      case 'gTLD':
        return parts.shift();
      case 'path':
        return pathname.split('/')[1];
      default: {
        const fragment = (this.urlParamsName && new URLSearchParams(search).get(this.urlParamsName)) || '';
        return fragment in this.resources ? fragment : '';
      }
    }
  }

  get #cacheLang() {
    return (!this.#isSub && this.cache && localStorage.getItem(this.#cacheKey)) || '';
  }

  set #lang(lang: string) {
    if (!this.#isSub) document.documentElement.lang = lang;
    this.currentLanguage = lang;
    this.onChange?.(lang);
  }

  /**
   * SSR 时使用过的模块记录到 store 中，渲染结束时读取，输出当前语言的语言包，
   * 客户端构造时恢复，不需要再加载
   */
  #ssrData = Object.defineProperties(
    {},
    {
      currentLanguage: { enumerable: true, get: () => this.currentLanguage },
      currentLanguagePack: { enumerable: true, get: () => this.#getCompletePack() },
    },
  );

  #inConstructor = true;
  constructor(options: I18nOptions<T>) {
    if (!options.resources[options.fallbackLanguage]) {
      throw new GemError('i18n: fallbackLanguage invalid');
    }

    Object.assign<I18n<T>, I18nOptions<T>>(this as I18n<T>, options);

    const ssrData = isServer ? undefined : (ssrHooks.createStore?.(this.#storeKey) as I18nJSON<T> | undefined);
    // 已经包含后备语言中的消息
    if (ssrData) this.resources[ssrData.currentLanguage] = ssrData.currentLanguagePack;

    // 子模块使用主模块当前的语言，可能和服务端输出时不同，例如客户端切换过语言
    const lang = this.#isSub
      ? this.currentLanguage || ssrData?.currentLanguage
      : ssrData?.currentLanguage || this.#urlParamsLang || this.currentLanguage || this.#cacheLang;

    if (lang) {
      this.#lang = lang;
      this.setLanguage(lang);
    } else {
      this.resetLanguage();
    }
    this.#inConstructor = false;
  }

  #getPack(lang: string): Record<string, Msg> | undefined {
    const data = this.resources[lang];
    return data && typeof data === 'object' ? (data as any) : undefined;
  }

  /** 当前语言包，包含后备语言中的消息，服务端输出后客户端不需要再加载后备语言 */
  #getCompletePack() {
    const pack: Record<string, Msg> = { ...this.#getPack(this.fallbackLanguage) };
    for (const [key, msg] of Object.entries(this.#getPack(this.currentLanguage) || {})) {
      if (msg) pack[key] = msg;
    }
    return pack as Partial<T>;
  }

  get(s: keyof T): string;
  get(s: keyof T, ...rest: (((str: string) => TemplateResult) | string)[]): TemplateResult;
  get(s: keyof T, ...rest: (((str: string) => TemplateResult) | string)[]) {
    if (isServer) ssrHooks.updateStore?.(this.#storeKey, this.#ssrData);
    const key = s as string;
    const currentPack = this.#getPack(this.currentLanguage);
    const fallbackPack = this.#getPack(this.fallbackLanguage);
    const msg = currentPack?.[key] || fallbackPack?.[key];
    // 客户端只加载当前语言，缺少消息时才加载后备语言
    if (!msg && currentPack && !fallbackPack) this.#loadFallback();
    const rawValue: string = (typeof msg === 'object' ? msg.message : msg) || `[${key}]`;
    if (!rest.length) return rawValue;
    return splice(rawValue, ...rest);
  }

  detectLanguage() {
    const availableLangs = Object.keys(this.resources);
    const uiLangs = navigator.languages.map((lang) => lang.replace(/-(.*)/, ($1) => $1.toUpperCase()));
    for (const lang of uiLangs) {
      const matched = availableLangs.find((e) => e === lang || lang.startsWith(`${e}-`));
      if (matched) return matched;
    }
    return this.fallbackLanguage;
  }

  #packCacheKey(lang: string) {
    return `${this.cachePrefix}:pack:${lang}`;
  }

  #readPackCache(lang: string): Partial<T> | undefined {
    if (!this.cache || isServer) return;
    try {
      return JSON.parse(localStorage.getItem(this.#packCacheKey(lang)) || 'null') || undefined;
    } catch {
      //
    }
  }

  /** 缓存语言包，只保留正在使用的语言，返回内容是否和缓存不同 */
  #writePackCache(lang: string, pack: Partial<T>) {
    if (!this.cache || isServer) return false;
    const key = this.#packCacheKey(lang);
    const json = JSON.stringify(pack);
    try {
      if (localStorage.getItem(key) === json) return false;
      const keep = new Set([lang, this.currentLanguage, this.fallbackLanguage].map((e) => this.#packCacheKey(e)));
      const prefix = this.#packCacheKey('');
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(prefix) && !keep.has(k)) localStorage.removeItem(k);
      }
      localStorage.setItem(key, json);
    } catch {
      // 例如超出存储限制
    }
    return true;
  }

  /** 已经加载时同步返回，避免构造函数中异步更新，有缓存时先使用缓存，加载完成后更新 */
  #loadPack(lang: string): Partial<T> | Promise<Partial<T>> {
    const data = this.resources[lang];
    if (typeof data !== 'function') return data;
    const cached = this.#readPackCache(lang);
    const loading = data().then((mod: any) => {
      const pack = (mod && typeof mod.default === 'object' ? mod.default : mod) as Partial<T>;
      this.resources[lang] = pack;
      if (this.#writePackCache(lang, pack) && cached) this.#updateElements();
      return pack;
    });
    if (!cached) return loading;
    // 加载失败时继续使用缓存
    loading.catch((err) => logger.warn(`${this.cachePrefix}: failed to load \`${lang}\``, err));
    this.resources[lang] = cached;
    return cached;
  }

  #fallbackLoading?: Promise<unknown>;
  #loadFallback() {
    this.#fallbackLoading ||= Promise.resolve(this.#loadPack(this.fallbackLanguage)).then(() => this.#updateElements());
  }

  // 更新所有元素，可能会更新许多不必要的元素
  #updateElements() {
    const temp: Element[] = [document.documentElement];
    while (temp.length) {
      const element = temp.pop()!;
      (element as any)[UpdateToken]?.();
      // 和 gem 更新机制一样使用深度优先
      temp.push(...[...element.children, ...(element.shadowRoot?.children || [])].reverse());
    }
  }

  setLanguage(lang: string): Promise<string> {
    const promise = this.#setLanguage(lang);
    this.#state.pending = promise;
    return promise;
  }

  async #setLanguage(lang: string): Promise<string> {
    if (!this.resources[lang]) {
      logger.warn(`${this.cachePrefix}: not found \`${lang}\``);
      return this.resetLanguage();
    }
    const subModules = [...this.#subModules].map((i18n) => i18n.setLanguage(lang));

    // 服务端渲染需要同步读取后备语言中的消息，输出的语言包也包含后备语言的消息
    const langs = isServer && lang !== this.fallbackLanguage ? [lang, this.fallbackLanguage] : [lang];
    const packs = langs.map((e) => this.#loadPack(e));
    if (packs.some((e) => e instanceof Promise)) await Promise.all(packs);

    if (!this.#inConstructor) this.#updateElements();
    if (lang !== this.currentLanguage) this.#lang = lang;
    if (this.cache === true) this.setCache();
    await Promise.all(subModules);
    return lang;
  }

  resetLanguage() {
    if (this.cache) localStorage.removeItem(this.#cacheKey);
    return this.setLanguage(this.detectLanguage());
  }

  // 一般用在 `onChange` 中，子模块的语言来自主模块，不缓存
  setCache() {
    if (this.#isSub) return;
    localStorage.setItem(this.#cacheKey, this.currentLanguage);
  }

  /**
   * 子模块跟随主模块切换语言，可以按路由分割语言包
   *
   * @example
   *
   * const pageI18n = i18n.createSubModule('page', {
   *   en: () => import('./en.json'),
   *   zh: () => import('./zh.json'),
   * });
   */
  createSubModule<K = Record<string, Msg>>(name: string, resources: Resources<K>) {
    creatingSubModule = true;
    try {
      const module = new I18n<K>({
        resources,
        cachePrefix: `${this.cachePrefix}-${name}`,
        currentLanguage: this.currentLanguage,
        fallbackLanguage: this.fallbackLanguage,
        cache: this.cache,
      });
      this.#subModules.add(module);
      return module;
    } finally {
      creatingSubModule = false;
    }
  }
}
