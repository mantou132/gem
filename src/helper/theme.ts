import { connect, createStore, updateStore, Store } from '..';

function replaceStyle(style: HTMLStyleElement, themeObj: Store<object>, media = '') {
  style.media = media;
  style.innerHTML = `:root {${Object.keys(themeObj).reduce((prev, key: keyof Store<object>) => {
    return prev + `--${key}:${themeObj[key]};`;
  }, '')}}`;
}

type CSSVars<T> = {
  [P in keyof T]: string;
};

const map = new WeakMap<CSSVars<unknown>, Store<unknown>>();

function create<T extends object>(themeObj: T, media?: string) {
  const theme = createStore<T>(themeObj);
  const style = document.createElement('style');
  const replace = () => replaceStyle(style, theme, media);
  connect(theme, replace);
  replace();
  document.head.append(style);
  const themeVarSet: { [index: string]: string } = {};
  map.set(themeVarSet, theme);
  Object.keys(theme).forEach(key => {
    themeVarSet[key] = `var(--${key})`;
  });
  return themeVarSet as CSSVars<T>;
}

/**
 * 创建主题
 *
 * @example
 * createTheme({
 *   primaryColor: '#eee',
 * });
 * // 指定媒体类型
 * createTheme('screen', {
 *   primaryColor: '#eee',
 * });
 */
export function createTheme<T extends object>(mediaOrThemeObj: T | string, themeObj?: T) {
  if (typeof mediaOrThemeObj === 'string') {
    if (!themeObj) throw 'argument error';
    return create(themeObj, mediaOrThemeObj);
  } else {
    return create(mediaOrThemeObj);
  }
}

/**
 * 更新主题
 * @param varSet 主题
 * @param newThemeObj 新主题
 */
export function updateTheme(varSet: CSSVars<object>, newThemeObj: object) {
  const store = map.get(varSet);
  if (store) updateStore(store, newThemeObj);
}
