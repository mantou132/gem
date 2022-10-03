import { connect, createStore, updateStore, Store } from '../lib/store';
import { camelToKebabCase, randomStr } from '../lib/utils';

type SomeType<T> = {
  [P in keyof T]: string;
};

const themeStoreMap = new WeakMap();

export function getThemeStore<T>(theme: SomeType<T>) {
  return themeStoreMap.get(theme) as Store<T>;
}

const themePropMap = new WeakMap();

export function getThemeProp<T>(theme: SomeType<T>) {
  return themePropMap.get(theme) as SomeType<T>;
}

function replaceStyle(style: HTMLStyleElement, theme: Record<string, unknown>) {
  const themeStore = themeStoreMap.get(theme);
  const themeProp = themePropMap.get(theme);
  const rules = Object.keys(themeStore).reduce((prev, key) => {
    if (!themeStore[key] || !themeProp[key]) return prev;
    return prev + `${themeProp[key]}:${themeStore[key]};`;
  }, '');
  style.textContent = `:root, :host {${rules}}`;
}

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
  const style = document.createElement('style');
  const themeStore = createStore<T>(themeObj);
  const theme: Record<string, string> = {};
  const themeProp: Record<string, string> = {};
  themePropMap.set(theme, themeProp);
  themeStoreMap.set(theme, themeStore);
  Object.keys(themeStore).forEach((key) => {
    themeProp[key] = `--${camelToKebabCase(key)}-${salt}`;
    theme[key] = `var(${themeProp[key]})`;
  });
  const replace = () => replaceStyle(style, theme);
  connect(themeStore, replace);
  replace();
  (document.head || document.documentElement).append(style);
  return theme as SomeType<T>;
}

/**
 * 更新主题
 * @param theme 主题
 * @param newThemeObj 新主题
 */
export function updateTheme<T = Record<string, unknown>>(theme: SomeType<T>, newThemeObj: Partial<T>) {
  const store = getThemeStore(theme);
  updateStore(store, newThemeObj);
}
