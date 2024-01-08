import { I18n } from '@mantou/gem/helper/i18n';

const resources = {
  en: {
    editOnGithub: 'Edit this page on GitHub',
    createOnGithub: 'Create on GitHub',
    footer: 'Generated by $1<GemBook>',
    lastUpdated: 'Last Updated',
  },
  zh: {
    editOnGithub: '在 Github 编辑此页',
    createOnGithub: '在 Github 上创建此页面',
    footer: '通过 $1<GemBook> 生成',
    lastUpdated: '上次更新',
  },
};

export const fallbackLanguage = document.documentElement.lang;

export const selfI18n = new I18n<typeof resources.en>({
  fallbackLanguage: fallbackLanguage in resources ? fallbackLanguage : 'en',
  resources,
  // 没有启动 i18n 时由 `html[lang]` 定义语言
  currentLanguage: fallbackLanguage,
});
