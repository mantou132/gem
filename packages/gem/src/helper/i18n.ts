import { UpdateHistoryParams } from '../lib/history';
import { html, TemplateResult, UpdateToken } from '../lib/element';
import { GemError } from '../lib/utils';
import type { RouteTrigger } from '../elements/base/route';

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

const modules = new Set<I18n<any>>();

type Msg =
  | {
      message: string;
      description: string;
    }
  | string;

export type I18nJSON<T> = {
  currentLanguage: string;
  currentLanguagePack: Partial<T>;
};

interface Resources<T> {
  [key: string]: Partial<T> | string;
}

interface I18nOptions<T> {
  resources: Resources<T>;
  fallbackLanguage: string;
  // 可以在构造函数中指定，但会被 URL 中的语言参数覆盖
  currentLanguage?: string;
  /**
   * `true` 表示在修改语言时自动缓存。
   * 为了避免缓存超出 `localStorage` 限制，语言包 URL 应该带版本号查询参数
   */
  cache?: boolean | 'manual';
  // lib 需要设置，避免被应用中的 i18n 一起清理掉语言缓存
  // 也用来作为 prerender 的 script type
  cachePrefix?: string;
  // 为 `path` 时页面的路由不能和语言代码相同
  urlParamsType?: 'path' | 'querystring' | 'ccTLD' | 'gTLD';
  urlParamsName?: string;
  onChange?: (currentLanguage: string) => void;
}

export class I18n<T = Record<string, Msg>> implements RouteTrigger {
  resources: Resources<T>;
  fallbackLanguage: string;
  currentLanguage: string;
  cache?: boolean | 'manual';
  cachePrefix = 'gem-i18n';
  urlParamsType?: 'path' | 'querystring' | 'ccTLD' | 'gTLD';
  urlParamsName?: string;
  onChange?: (currentLanguage: string) => void;

  // 兼容 `<gem-route>`
  replace = ({ path }: UpdateHistoryParams) => this.setLanguage(path!);
  getParams = () => ({ path: this.currentLanguage });

  get #cacheCurrentKey() {
    return `${this.cachePrefix}:current`;
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
      default:
        const fragment = (this.urlParamsName && new URLSearchParams(search).get(this.urlParamsName)) || '';
        return fragment in this.resources ? fragment : '';
    }
  }

  get #cacheLang() {
    return (this.cache && localStorage.getItem(this.#cacheCurrentKey)) || '';
  }

  get #isMain(): boolean {
    return !modules.has(this);
  }

  set #lang(lang: string) {
    if (this.#isMain) {
      document.documentElement.lang = lang;
    }
    this.currentLanguage = lang;
    this.onChange?.(lang);
  }

  constructor(options: I18nOptions<T>) {
    if (!options.resources[options.fallbackLanguage]) {
      throw new GemError('i18n: fallbackLanguage invalid');
    }

    Object.assign<I18n<T>, I18nOptions<T>>(this as I18n<T>, options);

    let currentLanguage = this.#urlParamsLang || this.currentLanguage || this.#cacheLang;

    const ele = document.querySelector(`[type*=${this.cachePrefix}]`);
    if (ele) {
      try {
        const prerenderData = JSON.parse(ele.textContent || '') as I18nJSON<T>;
        currentLanguage = prerenderData.currentLanguage;
        this.resources[prerenderData.currentLanguage] = prerenderData.currentLanguagePack;
      } catch {
        //
      }
    }

    if (currentLanguage) {
      this.#lang = currentLanguage;
      this.setLanguage(currentLanguage);
    } else {
      this.resetLanguage();
    }
  }

  get(s: keyof T): string;
  get(s: keyof T, ...rest: (((str: string) => TemplateResult) | string)[]): TemplateResult;
  get(s: keyof T, ...rest: (((str: string) => TemplateResult) | string)[]) {
    const currentLanguagePack = this.resources[this.currentLanguage] as any;
    const fallbackLanguagePack = this.resources[this.fallbackLanguage] as any;
    const msg = currentLanguagePack[s] || fallbackLanguagePack[s];
    const rawValue: string = msg?.message || msg || `[${s as string}]`;
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

  async setLanguage(lang: string): Promise<string> {
    if (this.#isMain) {
      modules.forEach(async (i18n) => await i18n.setLanguage(lang));
    }
    let pack: Partial<T>;
    const data = this.resources[lang];
    if (!data) {
      logger.warn(`${this.cachePrefix}: not found \`${lang}\``);
      return this.resetLanguage();
    }

    if (typeof data === 'string') {
      const prefix = `${this.cachePrefix}:`;
      const localKey = `${prefix}${data}`;
      const localPackString = localStorage.getItem(localKey);

      const fetchPack = async () => {
        const pkg = await (await fetch(data)).json();
        if (this.cache) {
          // 移除之前的版本缓存
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i) as string;
            if (key.startsWith(prefix)) {
              localStorage.removeItem(key);
            }
          }
          localStorage.setItem(localKey, JSON.stringify(pkg));
        }
        return pkg;
      };

      if (localPackString) {
        try {
          pack = JSON.parse(localPackString);
        } catch (e) {
          pack = await fetchPack();
        }
      } else {
        pack = await fetchPack();
      }
    } else {
      pack = data;
    }
    this.resources[lang] = pack;

    // update all element
    const temp: Element[] = [document.documentElement];
    while (!!temp.length) {
      const element = temp.pop()!;
      (element as any)[UpdateToken]?.();
      if (element.shadowRoot?.firstElementChild) temp.push(element.shadowRoot.firstElementChild);
      if (element.firstElementChild) temp.push(element.firstElementChild);
      if (element.nextElementSibling) temp.push(element.nextElementSibling);
    }

    if (lang !== this.currentLanguage) {
      this.#lang = lang;
    }
    // auto cache
    if (this.cache === true) {
      this.setCache();
    }
    return lang;
  }

  resetLanguage() {
    if (this.#isMain) {
      modules.forEach((i18n) => i18n.resetLanguage());
    }
    this.#lang = this.fallbackLanguage;
    if (this.cache) {
      localStorage.removeItem(this.#cacheCurrentKey);
    }
    return this.setLanguage(this.detectLanguage());
  }

  // 一般用在 `onChange` 中
  setCache() {
    if (this.#isMain) {
      modules.forEach((i18n) => i18n.setCache());
    }
    localStorage.setItem(this.#cacheCurrentKey, this.currentLanguage);
  }

  createSubModule<K = Record<string, Msg>>(name: string, resources: Resources<K>) {
    const module = new I18n<K>({
      resources,
      cachePrefix: `${this.cachePrefix}-${name}`,
      currentLanguage: this.currentLanguage,
      fallbackLanguage: this.fallbackLanguage,
      cache: this.cache,
    });
    modules.add(module);
    return module;
  }

  /**
   * @example
   *
   * html`
   *  <gem-reflect>
   *    <script type="${i18n.cachePrefix}">${JSON.stringify(i18n)}</script>
   *  </gem-reflect>
   * `
   */
  toJSON() {
    return {
      currentLanguage: this.currentLanguage,
      currentLanguagePack: this.resources[this.currentLanguage],
    };
  }
}
