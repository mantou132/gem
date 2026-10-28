import { isServer } from '@mantou/gem/lib/server';

/**
 * 默认语言没有路径前缀，其他语言使用 `/<lang>` 前缀，`prefixDefault` 为 `true` 时所有语言都有前缀，
 * 没有前缀的路径属于默认语言
 */
export function splitLanguage(pathname: string, languages: string[], defaultLanguage: string, prefixDefault = false) {
  const lang = pathname.split('/')[1];
  if ((prefixDefault || lang !== defaultLanguage) && languages.includes(lang)) {
    return { lang, path: pathname.slice(lang.length + 1) || '/' };
  }
  return { lang: defaultLanguage, path: pathname };
}

export function getBasePath(lang: string, defaultLanguage: string, prefixDefault = false) {
  return lang === defaultLanguage && !prefixDefault ? '' : `/${lang}`;
}

export function localizePath(lang: string, path: string, defaultLanguage: string, prefixDefault = false) {
  const basePath = getBasePath(lang, defaultLanguage, prefixDefault);
  return basePath && path === '/' ? basePath : basePath + path;
}

/** 用户上次使用的语言，所有语言都有前缀时，没有前缀的路径优先跳转到这个语言 */
export const LANGUAGE_COOKIE = 'gemkit-lang';

/** 客户端记住用户使用的语言，只在所有语言都有前缀并且路径有前缀时 */
export function saveLanguage(lang: string, prefixDefault: boolean) {
  if (isServer || !prefixDefault || location.pathname.split('/')[1] !== lang) return;
  // 默认是 `strict`，从其他网站进入时服务端读取不到
  const expires = Date.now() + 365 * 24 * 3600 * 1000;
  cookieStore.set({ name: LANGUAGE_COOKIE, value: lang, path: '/', expires, sameSite: 'lax' });
}

/** `Accept-Language` 中的语言，按权重排序，例如 `zh-CN,zh;q=0.9,en;q=0.8` */
export function parseAcceptLanguage(header: string) {
  return header
    .split(',')
    .map((item) => {
      const [lang, q] = item.trim().split(';q=');
      return { lang, q: q === undefined ? 1 : Number(q) };
    })
    .filter(({ lang, q }) => lang && lang !== '*' && q > 0)
    .sort((a, b) => b.q - a.q)
    .map(({ lang }) => lang);
}

/**
 * 依次匹配用户偏好的语言，每个语言先匹配完整的代码再匹配主语言，例如 `zh-CN` 匹配 `zh-CN`、`zh`，
 * 静态跳转页面中的脚本使用相同的规则
 */
export function matchLanguage(preferred: (string | undefined)[], languages: string[]) {
  return preferred.flatMap((lang) => (lang ? [lang, lang.split('-')[0]] : [])).find((lang) => languages.includes(lang));
}
