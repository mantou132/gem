import { html } from '@mantou/gem';
import { I18n } from '@mantou/gem/helper/i18n';

/** 加载过的语言包，`模块:语言` */
export const loads: string[] = [];

/** 记录加载的语言包加载函数 */
export const loader =
  <T>(name: string, lang: string, pack: T) =>
  async () => {
    loads.push(`${name}:${lang}`);
    return { default: pack };
  };

// zh 缺少部分条目，显式指定类型
export const i18n = new I18n<{ hello: string; onlyEn: string }>({
  fallbackLanguage: 'en',
  resources: {
    en: loader('main', 'en', { hello: 'Hello', onlyEn: 'Only en' }),
    zh: loader('main', 'zh', { hello: '你好' }),
  },
});

export const sub = i18n.createSubModule('sub', {
  en: loader('sub', 'en', { title: 'Sub', onlyEn: 'Only en' }),
  zh: loader('sub', 'zh', { title: '子模块' }),
});

// 渲染时没有使用，不输出语言包
export const unused = i18n.createSubModule('unused', {
  en: { text: 'Unused' },
  zh: { text: '没有使用' },
});

export const page = async (lang: string, withSub: boolean) => {
  await i18n.setLanguage(lang);
  return html`<p>${i18n.get('hello')} ${i18n.get('onlyEn')}</p>${withSub ? html`<b>${sub.get('title')}</b>` : ''}`;
};

/** 渲染时才创建的子模块，例如刚加载的页面模块中，等待 `ready` 后再渲染 */
export const lateSubModule = async (lang: string) => {
  await i18n.setLanguage(lang);
  const late = i18n.createSubModule('late', {
    en: loader('late', 'en', { title: 'Late' }),
    zh: loader('late', 'zh', { title: '后创建' }),
  });
  await i18n.ready;
  return html`<b>${late.get('title')}</b>`;
};
