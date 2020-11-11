import { connect, createStore, updateStore, Store } from '../lib/store';
import { camelToKebabCase, GemError, randomStr } from '../lib/utils';

function replaceStyle(style: HTMLStyleElement, themeStore: Store<Record<string, unknown>>, salt: string) {
  const rules = Object.keys(themeStore).reduce((prev, key: keyof Store<Record<string, unknown>>) => {
    return prev + `--${camelToKebabCase(key)}-${salt}:${themeStore[key]};`;
  }, '');
  style.textContent = `:root, :host {${rules}}`;
}

type Theme<T> = {
  [P in keyof T]: string;
};

const themeStoreMap = new WeakMap();

export function getThemeStore<T>(theme: Theme<T>): Store<T> {
  const store = themeStoreMap.get(theme);
  if (!store) throw new GemError('theme not found');
  return store;
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
  const replace = () => replaceStyle(style, themeStore, salt);
  connect(themeStore, replace);
  replace();
  (document.head || document.documentElement).append(style);
  const theme: Record<string, string> = {};
  themeStoreMap.set(theme, themeStore);
  Object.keys(themeStore).forEach((key) => {
    theme[key] = `var(--${camelToKebabCase(key)}-${salt})`;
  });
  return theme as Theme<T>;
}

/**
 * 更新主题
 * @param theme 主题
 * @param newThemeObj 新主题
 */
export function updateTheme<T = Record<string, unknown>>(theme: Theme<T>, newThemeObj: Partial<T>) {
  const store = getThemeStore(theme);
  updateStore(store, newThemeObj);
}
