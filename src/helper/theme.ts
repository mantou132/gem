import { connect, createStore, updateStore, Store } from '../lib/store';
import { camelToKebabCase, randomStr } from '../lib/utils';

function replaceStyle(salt: string, style: HTMLStyleElement, themeObj: Store<Record<string, unknown>>, media = '') {
  style.media = media;
  style.innerHTML = `:root {${Object.keys(themeObj).reduce((prev, key: keyof Store<Record<string, unknown>>) => {
    return prev + `--${camelToKebabCase(key)}-${salt}:${themeObj[key]};`;
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
export function createTheme<T extends Record<string, unknown>>(themeObj: T, media?: string) {
  const theme = createStore<T>(themeObj);
  const style = document.createElement('style');
  const salt = randomStr();
  const replace = () => replaceStyle(salt, style, theme, media);
  connect(theme, replace);
  replace();
  document.head.append(style);
  const themeVarSet: { [index: string]: string } = {};
  map.set(themeVarSet, theme);
  Object.keys(theme).forEach((key) => {
    themeVarSet[key] = `var(--${camelToKebabCase(key)}-${salt})`;
  });
  return themeVarSet as CSSVars<T>;
}

/**
 * 更新主题
 * @param varSet 主题
 * @param newThemeObj 新主题
 */
export function updateTheme<T = CSSVars<Record<string, unknown>>>(varSet: T, newThemeObj: Partial<T>) {
  const store = map.get(varSet);
  if (store) updateStore(store, newThemeObj);
}
