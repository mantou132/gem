export type Params = Record<string, string>;

export interface PageOptions<P extends Params = Params, D = unknown> {
  /** 页面标题，可以根据路由参数和页面数据生成 */
  title?: string | ((params: P, data: D) => string | Promise<string>);
  /**
   * 渲染页面前加载数据，结果通过 `data` 属性传给页面元素
   *
   * 服务端渲染和客户端导航时都会执行，所以只能使用同构的 API，例如 `import()` 和 `fetch`，
   * 服务端渲染的结果会输出到页面中，水合时直接使用，所以返回值只能是 JSON 值，
   * 只能在服务端执行的代码放在同名的 `*.server.ts` 中，其 `load` 的结果为第二个参数，
   * 没有提供该选项时直接使用 `*.server.ts` 的结果
   */
  load?: (params: P, serverData: any) => D | Promise<D>;
  /** 动态路由预渲染时使用的参数列表 */
  paths?: () => P[] | Promise<P[]>;
}

type PageClass = new (...args: any) => HTMLElement;

const pageOptionsMap = new WeakMap<PageClass, PageOptions<any, any>>();

// 即将渲染的页面的属性
let pendingProps: { params: Params; data: unknown } | undefined;

/** 页面元素可能在路由设置属性之前创建，例如水合时定义元素会立即升级服务端渲染的元素 */
export function setPendingProps(props: typeof pendingProps) {
  pendingProps = props;
}

/**
 * 标记页面元素，页面文件需要默认导出该元素，标签名由文件路径生成
 *
 * 页面元素可以通过 `params` 和 `data` 属性读取路由参数和 `load` 的结果
 *
 * @example
 * ```ts
 * @page('Home')
 * export default class HomePage extends GemElement {}
 * ```
 */
export function page<P extends Params = Params, D = unknown>(options: string | PageOptions<P, D> = {}) {
  return <T extends PageClass>(cls: T, _: ClassDecoratorContext) => {
    const Page = class extends cls {
      constructor(...args: any[]) {
        super(...args);
        if (pendingProps) Object.assign(this, pendingProps);
      }
    };
    pageOptionsMap.set(Page, typeof options === 'string' ? { title: options } : options);
    return Page;
  };
}

export function getPageOptions(cls: PageClass): PageOptions<Params, any> {
  return pageOptionsMap.get(cls) || {};
}
