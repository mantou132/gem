/** 默认语言没有路径前缀，其他语言使用 `/<lang>` 前缀 */
export function splitLanguage(pathname: string, languages: string[], defaultLanguage: string) {
  const lang = pathname.split('/')[1];
  if (lang !== defaultLanguage && languages.includes(lang)) {
    return { lang, path: pathname.slice(lang.length + 1) || '/' };
  }
  return { lang: defaultLanguage, path: pathname };
}

export function getBasePath(lang: string, defaultLanguage: string) {
  return lang === defaultLanguage ? '' : `/${lang}`;
}

export function localizePath(lang: string, path: string, defaultLanguage: string) {
  const basePath = getBasePath(lang, defaultLanguage);
  return basePath && path === '/' ? basePath : basePath + path;
}
