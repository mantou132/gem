import type { GemElement, Sheet } from '../lib/reactive';
import { css, SheetToken } from '../lib/reactive';
import { isServer } from '../lib/server';
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

function createThemeFromProps<T extends Record<string, unknown>>(
  themeObj: T,
  props: Record<string, string> = {},
  salt = randomStr(),
) {
  const styleSheet = css({})[SheetToken];
  const store = createStore<T>(themeObj);
  // 同步分配变量名，新增的键在更新后立即可读；样式内容随 store 异步更新
  const defineProps = () => {
    Object.keys(store).forEach((key) => {
      if (!props[key]) {
        props[key] = `--${camelToKebabCase(key)}-${salt}`;
        theme[key] = `var(${props[key]})`;
      }
    });
  };
  const theme: any = new Proxy(
    createUpdater({ [SheetToken]: styleSheet }, (payload: Partial<T>) => {
      store(payload);
      defineProps();
    }),
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
    defineProps();
    let rules = '';
    Object.keys(store).forEach((key) => {
      rules += `${props[key]}:${store[key]};`;
    });
    styleSheet.setContent(`&,:host{${rules}}`);
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
 *
 * `key` 用作 css 变量名的后缀，SSR 时让服务端和客户端的变量名一致，
 * `swc-plugin-gem` 的 `ssr` 选项会为模块顶层的主题自动添加
 */
export function createScopedTheme<T extends Record<string, unknown>>(themeObj: T, key?: string) {
  return createThemeFromProps(themeObj, {}, key);
}

/** 全局主题，`key` 同 `createScopedTheme` */
export function createTheme<T extends Record<string, unknown>>(themeObj: T, key?: string) {
  const result = createScopedTheme(themeObj, key);
  document.adoptedStyleSheets.push(result[SheetToken].getStyle());
  return result;
}

/** 用来覆盖全局主题 */
export function createOverrideTheme<T extends Record<string, unknown>>(theme: Theme<T>, themeObj: Partial<T>) {
  return createThemeFromProps(themeObj, getThemeProps(theme));
}

/**
 * 返回一个主题对象，但同时又是一个装饰器函数，用来装饰一个主题更新函数
 * 所有实例共享变量名，`key` 同 `createScopedTheme`
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
export function createDecoratorTheme<T extends Record<string, unknown>>(themeObj: T, key?: string) {
  const themeAsKeys = createThemeFromProps(themeObj, {}, key);
  const props = getThemeProps(themeAsKeys);
  const update = <E extends GemElement, V extends () => T, K = any[] | undefined>(
    getDep?: K extends readonly any[] ? (instance: E) => K : undefined,
  ) => {
    type Ctx = ClassFieldDecoratorContext<E, V> | ClassMethodDecoratorContext<E, V>;
    return (_: any, { addInitializer, access }: Ctx) => {
      addInitializer(function (this: E) {
        const theme = createThemeFromProps({ ...themeObj }, props);
        const style = theme[SheetToken].getStyle(this, true);
        this.internals.sheets.push(style);
        this.memo(
          () => {
            // https://bugs.webkit.org/show_bug.cgi?id=326327
            // SSR 需要更新样式表文本
            if (isServer || CSS.supports(`font:-apple-system-body`)) return theme(access.get(this).apply(this));
            const next = access.get(this).apply(this);
            const rule = style.cssRules[0] as CSSStyleRule;
            const eleTarget = this.shadowRoot
              ? rule
              : ((style.element?.sheet?.cssRules[0] as CSSStyleRule)?.cssRules?.[0] as CSSStyleRule);
            for (const key in props) {
              eleTarget?.style.setProperty(props[key], next[key]);
            }
          },
          getDep && (() => getDep(this) as any),
        );
      });
    };
  };
  // 不知道为什么 `as` 能解决外部 `SheetToken` 不能命名的问题
  return createUpdater(themeAsKeys, update) as Updater<Theme<T>, typeof update>;
}
