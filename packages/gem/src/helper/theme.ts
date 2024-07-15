import { connect, createStore, updateStore, Store } from '../lib/store';
import { camelToKebabCase, randomStr } from '../lib/utils';

type SomeType<T> = {
  [P in keyof T]: string;
};

const themeStoreMap = new WeakMap();

/**获取主题原始值 */
export function getThemeStore<T>(theme: SomeType<T>) {
  return themeStoreMap.get(theme) as Store<T>;
}

const themePropsMap = new WeakMap();

/**获取 css 变量名 */
export function getThemeProps<T>(theme: SomeType<T>) {
  return themePropsMap.get(theme) as SomeType<T>;
}

const setThemeFnMap = new WeakMap();

/**
 * 创建主题，插入 `document.head`
 * https://github.com/mantou132/gem/issues/33
 *
 * @example
 * createTheme({
 *   primaryColor: '#eee',
 * });
 */
export function createTheme<T extends Record<string, unknown>>(themeObj: T) {
  const salt = randomStr();
  const style = new CSSStyleSheet();
  const store = createStore<T>(themeObj);
  const theme: Record<string, string> = {};
  const props: Record<string, string> = {};
  themePropsMap.set(theme, props);
  themeStoreMap.set(theme, store);
  const setTheme = () =>
    Object.keys(store).forEach((key) => {
      if (props[key]) return;
      props[key] = `--${camelToKebabCase(key)}-${salt}`;
      theme[key] = `var(${props[key]})`;
    });
  setThemeFnMap.set(theme, setTheme);
  setTheme();
  const getStyle = () =>
    `:root, :host {${Object.keys(store).reduce((prev, key) => prev + `${props[key]}:${store[key]};`, '')}}`;
  const replace = () => style.replaceSync(getStyle());
  connect(store, replace);
  replace();
  document.adoptedStyleSheets.push(style);
  return theme as SomeType<T>;
}

/**
 * 更新主题
 * @param theme 主题
 * @param newThemeObj 新主题
 */
export function updateTheme<T = Record<string, unknown>>(theme: SomeType<T>, newThemeObj: Partial<T>) {
  updateStore(getThemeStore(theme), newThemeObj);
  setThemeFnMap.get(theme)();
}

export function useTheme<T extends Record<string, unknown>>(themeObj: T) {
  const theme = createTheme(themeObj);
  return [theme, (newThemeObj: Partial<T>) => updateTheme(theme, newThemeObj)] as const;
}
