import { createStore, updateStore, Store } from '../lib/store';
import { html, TemplateResult } from '../lib/element';
import { GemError } from '../lib/utils';

// Hello, $1
// See $1<detail>
// 嵌套模版中用到 $ < > 时使用 &dollar; &lt;  &gt;  替代
const splitReg = /\$\d(?:<[^>]*>)?/;
const matchReg = /\$(\d)(<([^>]*)>)?/g;
const matchStrIndex = 3;

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

interface Options<T> {
  resources: Resources<T>;
  fallbackLanguage: string;
  currentLanguage?: string;
  cache?: boolean;
  cachePrefix?: string;
  urlParamsType?: 'path' | 'querystring' | 'ccTLD' | 'gTLD';
  urlParamsName?: string;
  onChange?: (currentLanguage: string) => void;
}

export class I18n<T = Record<string, Msg>> {
  resources: Resources<T>;
  fallbackLanguage: string;
  // 在构造函数中指定
  currentLanguage: string;
  cache?: boolean;
  cachePrefix = 'gem@i18n';
  urlParamsType?: 'path' | 'querystring' | 'ccTLD' | 'gTLD';
  urlParamsName?: string;
  onChange?: (currentLanguage: string) => void;

  store: Store<any>;

  get cacheCurrentKey() {
    return `${this.cachePrefix}:current`;
  }

  get urlParamsLang() {
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
        return this.urlParamsName && new URLSearchParams(search).get(this.urlParamsName);
    }
  }

  get cacheLang() {
    return this.cache ? localStorage.getItem(this.cacheCurrentKey) || '' : '';
  }

  set lang(lang: string) {
    this.currentLanguage = lang;
    document.documentElement.lang = lang;
    this.onChange?.(lang);
  }

  constructor(options: Options<T>) {
    if (!options.resources[options.fallbackLanguage]) {
      throw new GemError('i18n: fallbackLanguage invalid');
    }

    this.store = createStore(this as any);
    Object.assign<I18n<T>, Options<T>>(this as I18n<T>, options);

    let currentLanguage = this.currentLanguage || this.urlParamsLang || this.cacheLang;

    const ele = document.querySelector('[type*=gem-i18n]');
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
      this.lang = currentLanguage;
      this.setLanguage(currentLanguage);
    } else {
      this.resetLanguage();
    }
  }

  get(s: keyof T, ...rest: (((s: string) => TemplateResult) | string)[]) {
    const currentLanguagePack = this.resources[this.currentLanguage] as any;
    const fallbackLanguagePack = this.resources[this.fallbackLanguage] as any;
    const msg = currentLanguagePack[s] || fallbackLanguagePack[s];
    const rawValue: string = msg?.message || msg || `[${s}]`;
    if (!rest.length) return rawValue;

    const templateArr = rawValue.split(splitReg) as unknown as TemplateStringsArray;
    const values: (TemplateResult | string)[] = [];
    let result: RegExpExecArray | null;
    while ((result = matchReg.exec(rawValue))) {
      const str = result[matchStrIndex];
      const index = Number(result[1]) - 1;
      const arg = rest[index];
      values.push(typeof arg === 'string' ? arg : arg(str));
    }
    return html(templateArr, ...values);
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
    let pack: Partial<T>;
    const data = this.resources[lang];
    if (!data) {
      // eslint-disable-next-line no-console
      console.warn(`i18n: not found \`${lang}\``);
      return this.resetLanguage();
    }

    if (typeof data === 'string') {
      const { href, origin, pathname } = new URL(data, location.href);
      const localKey = `${this.cachePrefix}:${href}`;
      const localPackString = localStorage.getItem(localKey);

      const fetchPack = async () => {
        const pack = await (await fetch(data)).json();
        if (this.cache) {
          // 移除之前的版本缓存，只有使用 querystring 标记版本才有效
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i) as string;
            if (key.startsWith(`${this.cachePrefix}:${origin}${pathname}?`)) {
              localStorage.removeItem(key);
            }
          }
          localStorage.setItem(localKey, JSON.stringify(pack));
        }
        return pack;
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
    if (lang !== this.currentLanguage) {
      this.lang = lang;
    }
    if (this.cache && lang !== this.fallbackLanguage) {
      localStorage.setItem(this.cacheCurrentKey, lang);
    }
    updateStore(this.store, {});
    return lang;
  }

  resetLanguage() {
    this.lang = this.fallbackLanguage;
    if (this.cache) {
      localStorage.removeItem(this.cacheCurrentKey);
    }
    return this.setLanguage(this.detectLanguage());
  }

  /**
   * prepare: @connectStore(i18n.store)
   *
   * @example
   *
   * html`
   *  <gem-reflect>
   *    <script type="gem-i18n">${JSON.stringify(i18n)}</script>
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
