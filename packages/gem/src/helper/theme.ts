import type { GemElement, Sheet } from '../lib/reactive';
import { css, SheetToken } from '../lib/reactive';
import type { Store } from '../lib/store';
import { connect, createStore } from '../lib/store';
import type { Updater } from '../lib/utils';
import { camelToKebabCase, createUpdater, randomStr } from '../lib/utils';

export type Theme<T> = Updater<T> &
  Sheet<unknown> & {
    [K in keyof T as K extends `${string}Color`
      ? `${string & K}${'' | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900}`
      : K]: string;
  };

const themeStoreMap = new WeakMap();
const themePropsMap = new WeakMap();

/**获取主题原始值 */
export function getThemeStore<T>(theme: Theme<T>) {
  return themeStoreMap.get(theme) as Store<T>;
}

/**获取 css 变量名 */
export function getThemeProps<T>(theme: Theme<T>) {
  return themePropsMap.get(theme) as Theme<T>;
}

function createThemeFromProps<T extends Record<string, unknown>>(themeObj: T, props: Record<string, string> = {}) {
  const salt = randomStr();
  const styleSheet = css({})[SheetToken];
  const store = createStore<T>(themeObj);
  const theme: any = new Proxy(
    createUpdater({ [SheetToken]: styleSheet }, (payload: Partial<T>) => store(payload)),
    {
      get(target: any, key: string) {
        if (!target[key]) {
          const [_, origin, weight] = key.match(/^(\w*Color)(\d+)$/) || [];
          if (origin) target[key] = `oklch(from ${target[origin]} calc(l - ${(Number(weight) - 400) / 1000}) c h)`;
        }
        return target[key];
      },
    },
  );
  themePropsMap.set(theme, props);
  themeStoreMap.set(theme, store);

  const updateContent = () => {
    let rules = '';
    Object.keys(store).forEach((key) => {
      if (!props[key]) {
        props[key] = `--${camelToKebabCase(key)}-${salt}`;
        theme[key] = `var(${props[key]})`;
      }
      rules += `${props[key]}:${store[key]};`;
    });
    styleSheet.setContent(`:scope,:host{${rules}}`);
  };
  updateContent();
  connect(store, () => {
    updateContent();
    styleSheet.updateStyle();
  });
  return theme as Theme<T>;
}

/**
 * 用于 `@adoptedStyle(theme)`，类似 `css`
 */
export function createScopedTheme<T extends Record<string, unknown>>(themeObj: T) {
  return createThemeFromProps(themeObj);
}

/** 全局主题 */
export function createTheme<T extends Record<string, unknown>>(themeObj: T) {
  const result = createScopedTheme(themeObj);
  document.adoptedStyleSheets.push(result[SheetToken].getStyle());
  return result;
}

/** 用来覆盖全局主题 */
export function createOverrideTheme<T extends Record<string, unknown>>(theme: Theme<T>, themeObj: Partial<T>) {
  return createThemeFromProps(themeObj, getThemeProps(theme));
}

/**
 * 返回一个主题对象，但同时又是一个装饰器函数，用来装饰一个主题更新函数
 *
 * @example
 * ```ts
 * const elementTheme = createDecoratorTheme({ color: '' });
 * class MyElement {
 *   @​elementTheme()
 *   #theme = () => ({ color: this.color });
 * }
 * ```
 * */
export function createDecoratorTheme<T extends Record<string, unknown>>(themeObj: T) {
  const themeAsKeys = createThemeFromProps(themeObj);
  const props = getThemeProps(themeAsKeys);
  const update = <E extends GemElement, V extends () => T, K = any[] | undefined>(
    getDep?: K extends readonly any[] ? (instance: E) => K : undefined,
  ) => {
    type Ctx = ClassFieldDecoratorContext<E, V> | ClassMethodDecoratorContext<E, V>;
    return (_: any, { addInitializer, access }: Ctx) => {
      addInitializer(function (this: E) {
        const theme = createThemeFromProps({ ...themeObj }, props);
        this.internals.sheets.push(theme[SheetToken].getStyle(this));
        this.memo(() => theme(access.get(this).apply(this)), getDep && (() => getDep(this) as any));
      });
    };
  };
  // 不知道为什么 `as` 能解决外部 `SheetToken` 不能命名的问题
  return createUpdater(themeAsKeys, update) as Updater<Theme<T>, typeof update>;
}
