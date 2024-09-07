import { connect, Store, useStore } from '../lib/store';
import { camelToKebabCase, randomStr } from '../lib/utils';
import { GemElement, SheetToken, createCSSSheet } from '../lib/element';

export type Theme<T> = ReturnType<typeof createCSSSheet> & {
  [K in keyof T as K extends `${string}Color`
    ? `${string & K}${'' | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900}`
    : K]: T[K];
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

function useThemeFromProps<T extends Record<string, unknown>>(themeObj: T, props: Record<string, string> = {}) {
  const salt = randomStr();
  const styleSheet = createCSSSheet({})[SheetToken];
  const [store, updateStore] = useStore<T>(themeObj);
  const theme: any = new Proxy(
    { [SheetToken]: styleSheet },
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
  return [theme as Theme<T>, updateStore] as const;
}

/**
 * 用于 `@adoptedStyle(theme)`，类似 `createCSSSheet`
 */
export function useScopedTheme<T extends Record<string, unknown>>(themeObj: T) {
  return useThemeFromProps(themeObj);
}

/**全局主题 */
export function useTheme<T extends Record<string, unknown>>(themeObj: T) {
  const result = useScopedTheme(themeObj);
  document.adoptedStyleSheets.push(result[0][SheetToken].getStyle());
  return result;
}

/**用来覆盖全局主题 */
export function useOverrideTheme<T extends Record<string, unknown>>(theme: Theme<T>, themeObj: Partial<T>) {
  return useThemeFromProps(themeObj, getThemeProps(theme));
}

export function useDecoratorTheme<T extends Record<string, unknown>>(themeObj: T) {
  const [themeAsKeys] = useThemeFromProps(themeObj);
  const props = getThemeProps(themeAsKeys);
  const updateDecorator =
    <E extends GemElement, V extends () => T, K = any[] | undefined>(
      getDep?: K extends readonly any[] ? (instance: E) => K : undefined,
    ) =>
    (_: any, { addInitializer, access }: ClassFieldDecoratorContext<E, V> | ClassMethodDecoratorContext<E, V>) => {
      addInitializer(function (this: E) {
        const [theme, update] = useThemeFromProps({ ...themeObj }, props);
        this.internals.sheets.push(theme[SheetToken].getStyle(this));
        this.memo(() => update(access.get(this).apply(this)), getDep && (() => getDep(this) as any));
      });
    };
  return [themeAsKeys, updateDecorator] as const;
}
