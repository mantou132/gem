import type { Meta } from './meta';

export type Params = Record<string, string>;

/** `title` 和 `meta` 的参数，`data` 是 `load` 的结果 */
export interface RouteContext<P extends Params = Params, D = unknown> {
  /** 路由参数，layout 不包括子路由的部分 */
  params: P;
  data: D;
}

/** `load` 的参数，`data` 是同名的 `*.server.ts` 的 `load` 的结果，类型为 `$types` 中的 `ServerData` */
export type LoadContext<P extends Params = Params, S = any> = RouteContext<P, S>;

export interface LayoutOptions<P extends Params = Params, D = unknown, S = any> {
  /**
   * 渲染前加载数据，结果通过 `data` 属性传给元素
   *
   * 服务端渲染和客户端导航时都会执行，所以只能使用同构的 API，例如 `import()` 和 `fetch`，
   * 服务端渲染的结果会输出到页面中，水合时直接使用，所以返回值只能是 JSON 值，
   * 只能在服务端执行的代码放在同名的 `*.server.ts` 中，其 `load` 的结果为参数的 `data`，
   * 没有提供该选项时直接使用 `*.server.ts` 的结果
   */
  load?: (ctx: LoadContext<P, S>) => D | Promise<D>;
  /**
   * 页面的 `<meta>`，例如 `{ description: '...', 'og:image': '...' }`，可以根据路由参数和数据生成，
   * layout 和页面的合并在一起，内层的覆盖外层的同名 key
   */
  meta?: Meta | ((ctx: RouteContext<P, D>) => Meta | Promise<Meta>);
}

export interface PageOptions<P extends Params = Params, D = unknown, S = any> extends LayoutOptions<P, D, S> {
  /** 页面标题，可以根据路由参数和页面数据生成 */
  title?: string | ((ctx: RouteContext<P, D>) => string | Promise<string>);
  /** 动态路由预渲染时使用的参数列表，每个语言分别调用，没有多语言时 `lang` 为空字符串 */
  paths?: (ctx: { lang: string }) => P[] | Promise<P[]>;
}

type RouteClass = new (...args: any) => HTMLElement;

/** 页面和 layout 元素的 `params` 和 `data` 属性需要和类型参数一致，例如和 `load` 的返回值一致 */
type RouteElementClass<P, D> = new (...args: any) => HTMLElement & { params?: P; data?: D };

const optionsMap = new WeakMap<RouteClass, PageOptions<any, any, any>>();

/**
 * 标记页面元素，页面文件需要默认导出该元素，标签名由文件路径生成
 *
 * 页面元素可以通过 `params` 和 `data` 属性读取路由参数和 `load` 的结果，
 * 类型参数依次是路由参数、`data` 和服务端数据（`load` 参数中的 `data`），例如 `@page<Params, Post, ServerData>`
 *
 * @example
 * ```ts
 * @page('Home')
 * export default class HomePage extends GemElement {}
 * ```
 */
export function page<P extends Params = Params, D = unknown, S = any>(options: string | PageOptions<P, D, S> = {}) {
  return (cls: RouteElementClass<P, D>, _: ClassDecoratorContext) => {
    optionsMap.set(cls, typeof options === 'string' ? { title: options } : options);
  };
}

/**
 * 标记 layout 元素，`_layout` 文件需要默认导出该元素，标签名由文件路径生成
 *
 * layout 元素可以通过 `params` 和 `data` 属性读取路由参数（不包括子路由的部分）和 `load` 的结果，
 * 在子路由间导航时，路由参数不变就不会重新加载
 *
 * @example
 * ```ts
 * @layout({ load: () => fetch('/api/menu').then((res) => res.json()) })
 * export default class RootLayout extends GemElement {}
 * ```
 */
export function layout<P extends Params = Params, D = unknown, S = any>(options: LayoutOptions<P, D, S> = {}) {
  return (cls: RouteElementClass<P, D>, _: ClassDecoratorContext) => {
    optionsMap.set(cls, options);
  };
}

export function getPageOptions(cls: RouteClass): PageOptions<Params, any> {
  return optionsMap.get(cls) || {};
}
