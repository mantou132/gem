import { createStore, updateStore, Store } from '../lib/store';
import { html, TemplateResult } from '../lib/element';

const cachePrefix = 'gem@i18n';
const currentKey = `${cachePrefix}:current`;
const htmlLang = document.documentElement.lang;
// Hello, $1
// See $1<detail>
// 嵌套模版中用到 $ < > 时使用 &dollar; &lt;  &gt;  替代
const splitReg = /\$\d(?:<[^>]*>)?/;
const matchReg = /\$(\d)(<([^>]*)>)?/g;
const matchStrIndex = 3;

export class I18n<T = Record<string, string>> {
  resources: {
    [key: string]: Partial<T> | string;
  };
  fallbackLanguage: string;
  currentLanguage: string;
  store: Store<this>;
  cache: boolean;

  constructor(options: {
    resources: {
      [key: string]: Partial<T> | string;
    };
    fallbackLanguage: string;
    currentLanguage?: string;
    cache?: boolean;
  }) {
    if (!options.resources[options.fallbackLanguage]) {
      throw new Error('i18n: fallbackLanguage invalid');
    }
    this.store = createStore(this);
    this.resources = options.resources;
    this.fallbackLanguage = options.fallbackLanguage;
    this.cache = !!options.cache;
    this.currentLanguage = options.currentLanguage || '';
    if (this.cache) {
      this.currentLanguage = localStorage.getItem(currentKey) || '';
    }
    if (!this.currentLanguage) {
      this.currentLanguage = options.fallbackLanguage;
      this.resetLanguage();
    } else {
      this.setLanguage(this.currentLanguage);
    }
  }

  get(s: keyof T, ...rest: (((s: string) => TemplateResult) | string)[]) {
    const currentLanguagePack = this.resources[this.currentLanguage] as T | undefined;
    if (!currentLanguagePack) this.resetLanguage();
    const fallbackLanguagePack = this.resources[this.fallbackLanguage] as T;
    const rawValue = (currentLanguagePack?.[s] || fallbackLanguagePack?.[s] || '') as string;
    if (!rest.length) return rawValue;

    const templateArr = (rawValue.split(splitReg) as unknown) as TemplateStringsArray;
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
    const uiLangs = [htmlLang, ...navigator.languages].map(lang => lang.replace(/-(.*)/, $1 => $1.toUpperCase()));
    for (const lang of uiLangs) {
      const matched = availableLangs.find(e => e === lang || lang.startsWith(`${e}-`));
      if (matched) return matched;
    }
    return this.fallbackLanguage;
  }

  async setLanguage(lang: string): Promise<string> {
    let pack: Partial<T>;
    const data = this.resources[lang];
    if (!data) {
      console.warn(`i18n: not found \`${lang}\``);
      return await this.resetLanguage();
    }

    if (typeof data === 'string') {
      const localKey = `${cachePrefix}:${data}`;
      const localPackString = localStorage.getItem(localKey);

      const fetchPack = async () => {
        const pack = await (await fetch(data)).json();
        if (this.cache) {
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
    document.documentElement.lang = lang;
    this.currentLanguage = lang;
    if (this.cache) {
      localStorage.setItem(currentKey, lang);
    }
    updateStore(this.store, {});
    return lang;
  }

  resetLanguage() {
    localStorage.removeItem(currentKey);
    return this.setLanguage(this.detectLanguage());
  }
}
