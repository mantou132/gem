import { connect, createStore, updateStore, Store, camelToKebabCase } from '..';

function replaceStyle(style: HTMLStyleElement, themeObj: Store<object>, media = '') {
  style.media = media;
  style.innerHTML = `:root {${Object.keys(themeObj).reduce((prev, key: keyof Store<object>) => {
    return prev + `--${camelToKebabCase(key)}:${themeObj[key]};`;
  }, '')}}`;
}

type CSSVars<T> = {
  [P in keyof T]: string;
};

const map = new WeakMap<CSSVars<unknown>, Store<unknown>>();

/**
 * 创建主题，插入 `document.head`
 *
 * @example
 * createTheme({
 *   primaryColor: '#eee',
 * });
 * // 指定媒体类型
 * createTheme({
 *   primaryColor: '#eee',
 * }, 'screen');
 */
export function createTheme<T extends object>(themeObj: T, media?: string) {
  const theme = createStore<T>(themeObj);
  const style = document.createElement('style');
  const replace = () => replaceStyle(style, theme, media);
  connect(theme, replace);
  replace();
  document.head.append(style);
  const themeVarSet: { [index: string]: string } = {};
  map.set(themeVarSet, theme);
  Object.keys(theme).forEach(key => {
    themeVarSet[key] = `var(--${camelToKebabCase(key)})`;
  });
  return themeVarSet as CSSVars<T>;
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
