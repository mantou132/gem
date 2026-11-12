import type { Emitter } from '../../lib/decorators';
import { adoptedStyle, boolattribute, effect, emitter, light, property, shadow, template } from '../../lib/decorators';
import { createState, css, GemElement, html } from '../../lib/element';
import type { RouteOptions, UpdateHistoryParams } from '../../lib/history';
import { createPath, history, matchPath, titleStore } from '../../lib/history';
import type { TemplateResult } from '../../lib/lit-html';
import type { Store } from '../../lib/store';
import { connect, createStore } from '../../lib/store';
import type { QueryString } from '../../lib/utils';
import { addListener } from '../../lib/utils';

export { createHistoryParams, createPath, matchPath, type RouteOptions } from '../../lib/history';

type Params = Record<string, string>;

export interface RouteItem<T = unknown> {
  // 支持 *
  // 支持 /a/*
  // 不支持相对路径
  // 不能匹配查询字符串
  pattern: string;
  redirect?: string;
  content?: TemplateResult;
  // 返回 `undefined` 意味着不会执行 `render`， 支持 React 等组件挂载到 `<gem-route>` 元素下
  getContent?: (
    params: Params,
    renderRoot: DocumentFragment | GemLightRouteElement,
  ) => TemplateResult | undefined | Promise<TemplateResult | undefined>;
  title?: string;
  // 用来传递数据
  data?: T;
}

export type RoutesObject<T = unknown> = Record<string, RouteItem<T>>;

const INIT_CONTENT = html``;

type State = {
  content?: TemplateResult;
};

export type RouteTrigger = {
  store?: Store<any>;
  replace: (arg: UpdateHistoryParams) => void;
  getParams: () => { path: string; query?: string | QueryString; hash?: string };
};

const scrollPositionMap = new Map<string, number>();

// 导航到了新的历史记录，前进、后退和页面加载时为 `false`
let pushed = false;

@light({ penetrable: true })
export class GemLightRouteElement extends GemElement {
  @boolattribute transition: boolean;
  @property routes?: RouteItem[] | RoutesObject;
  /**
   * 路由更新后更新的 store，能从中读取到安全的路由数据
   *
   * @example
   * const locationStore = GemRouteElement.createLocationStore()
   * html`<gem-route .locationStore=${locationStore}>`
   */
  @property locationStore?: ReturnType<(typeof GemRouteElement)['createLocationStore']>;
  @property key?: any; // 除了 href 提供另外一种方式来更新，比如语言更新也需要刷新 <gem-route>
  @emitter loading: Emitter<RouteItem | null>;
  @emitter beforeroutechange: Emitter<RouteItem | null>;
  @emitter routechange: Emitter<RouteItem | null>; // path 改变或者 key 改变，包含初始渲染
  @emitter error: Emitter<any>;

  /**
   * 自动让滚动容器恢复滚动位置，导航到新的历史记录时滚动到顶部，
   * 函数返回空值时不处理当前路由，例如只有子路由渲染后才需要滚动
   */
  @property scrollContainer?: Element | (() => Element | null | undefined);
  /**恢复滚动位置前等待，例如等待异步加载的内容撑开滚动容器 */
  @property scrollWait?: () => Promise<unknown>;
  /**默认当有 `hash` 时不进行滚动 */
  @property scrollIgnoreHash?: boolean;

  @property trigger: RouteTrigger = history;

  /**当前使用的路由对象 */
  currentRoute: RouteItem | null;
  /**当前匹配的路由的 params */
  currentParams: Params = {};

  /**不要多个 `<gem-route>` 共享，因为那样会导致后面的元素卸载前触发更新 */
  static createLocationStore = () => {
    const { path, query, hash, data } = history.getParams();
    return createStore({ path, query, hash, data, params: {} as Params });
  };

  static findRoute = (target: RouteItem[] | RoutesObject = [], path: string) => {
    let defaultRoute: RouteItem | null = null;
    let routes: RouteItem[];
    if (Array.isArray(target)) {
      routes = target;
    } else {
      routes = Object.values(target);
    }
    for (const route of routes) {
      if ('*' === route.pattern) {
        defaultRoute = route;
      } else {
        const params = matchPath(route.pattern, path);
        if (params) {
          return { route, params };
        }
      }
    }
    return { route: defaultRoute };
  };

  get #scrollContainer() {
    return typeof this.scrollContainer === 'function' ? this.scrollContainer() : this.scrollContainer;
  }

  #state = createState<State>({ content: INIT_CONTENT });

  #updateLocationStore = () => {
    if (!this.locationStore) return;
    const { path, query, hash, data } = history.getParams();
    this.locationStore({
      path,
      params: this.currentParams,
      query,
      hash,
      data,
    });
  };

  // 已经处理过滚动的历史记录，同一条历史记录重新渲染时保持滚动位置
  #scrolledKey?: string;

  #updateScrollContainerPosition = async () => {
    const container = this.#scrollContainer;
    const key = history.currentKey;
    if (!container || key === this.#scrolledKey) return;
    this.#scrolledKey = key;
    const scrollTop = scrollPositionMap.get(key);
    if (!pushed && scrollTop !== undefined) {
      await this.scrollWait?.();
      // 等待时可能已经导航
      if (key === history.currentKey) container.scroll(0, scrollTop);
      return;
    }
    // 前进、后退或者页面加载时位置未知（例如刷新后），保持浏览器恢复的位置，浏览器只恢复文档的滚动位置
    if (!pushed && container === document.scrollingElement) return;
    if (this.scrollIgnoreHash || !history.getParams().hash) container.scroll(0, 0);
  };

  #lastLoader?: TemplateResult | Promise<TemplateResult | undefined>;
  #setContent = (route: RouteItem | null, params: Params, content?: TemplateResult) => {
    this.beforeroutechange(route);
    this.#lastLoader = undefined;
    this.currentRoute = route;
    this.currentParams = params;
    const changeContent = async () => {
      this.#state({ content });
      // 要确保新页面能读取到新路由数据
      this.#updateLocationStore();
      // 等待页面渲染完成
      await Promise.resolve();
      this.#updateScrollContainerPosition();
      this.routechange(this.currentRoute);
    };
    if (this.transition && 'startViewTransition' in document) {
      (document as any).startViewTransition(() => changeContent());
    } else {
      changeContent();
    }
  };

  @effect((i) => [i.scrollContainer])
  #rememberScrollPosition = () => {
    if (!this.scrollContainer) return;
    return addListener(history, 'beforechange', () => {
      // 前进和后退时浏览器的历史记录已经改变，Gem 的还没有改变
      pushed = globalThis.history.state?.$key === history.currentKey;
      const container = this.#scrollContainer;
      if (container) scrollPositionMap.set(history.currentKey, container.scrollTop);
    });
  };

  // history or i18n
  @effect((i) => [i.scrollContainer])
  #connectTriggerStore = () => this.trigger.store && connect(this.trigger.store, () => this.#state());

  #updateContentDep = () => {
    const { path, query, hash } = this.trigger.getParams();
    return [this.key, path, query, hash] as const;
  };

  @effect((i) => i.#updateContentDep())
  #updateContent = ([key, path]: any, old?: any) => {
    // 只有查询参数改变
    if (old && key === old[0] && path === old[1]) {
      this.#updateLocationStore();
      return;
    }
    this.update();
  };

  @template((i) => !i.inert)
  #content = () => {
    const { content } = this.#state;
    if (content === undefined) return;

    if (!this.shadowRoot) {
      if (content === INIT_CONTENT) return;
      return html`${content}`;
    }

    return content === INIT_CONTENT ? html`<slot></slot>` : content;
  };

  // 重写 `update`，并暴露为公共字段
  update = async () => {
    const { path, hash, query } = this.trigger.getParams();
    const { route, params = {} } = GemRouteElement.findRoute(this.routes, path);
    const { redirect, content, getContent } = route || {};
    if (redirect) {
      this.trigger.replace({
        path: createPath({ pattern: redirect }, { params }),
        query,
        hash,
      });
      return;
    }
    if (this.trigger === history) {
      // 嵌套路由执行顺序也是从父到子
      if (location.href !== titleStore.url || route?.title) {
        titleStore({ url: location.href, title: route?.title });
      }
    }
    const contentOrLoader = content || getContent?.(params, this.shadowRoot || this);
    this.loading(route);
    this.#lastLoader = contentOrLoader;
    const isSomeLoader = () => this.#lastLoader === contentOrLoader;
    try {
      const newContent = await contentOrLoader;
      if (isSomeLoader()) this.#setContent(route, params, newContent);
    } catch (err) {
      if (isSomeLoader()) this.error(err);
    }
  };
}

const style = css`
  :host(:where(:not([hidden]))),
  :not(:defined) {
    display: contents;
  }
`;

@shadow()
@adoptedStyle(style)
export class GemRouteElement extends GemLightRouteElement {}
