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
