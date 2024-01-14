import { GemElement, html, TemplateResult } from '../../lib/element';
import { property, emitter, Emitter, boolattribute } from '../../lib/decorators';
import { createStore, updateStore, Store, connect } from '../../lib/store';
import { titleStore, history, UpdateHistoryParams } from '../../lib/history';
import { addListener, QueryString } from '../../lib/utils';

const UNNAMED_PARAM_PREFIX = '_';

// '/test/:a' /^\/test\/(?<a>[^/]+)$/i
// '/test/:a/b' /^\/test\/?<a>([^/]+)\/b$/i
// '/test/*' /^\/test\/(?<_0>.*)$/i
// '/test/:a/*' /^\/test\/(?<a>[^/]+)\/(?<_0>.*)$/i
// '/test/*/:b /^\/test\/(?<_0>.*)\/(?<a>[^/]+)$/i
class ParamsRegExp extends RegExp {
  constructor(pattern: string) {
    let i = 0;
    super(
      `^${pattern.replace(/((:[^/$]+)|(\*))/g, (_m, name: string) => {
        if (name === '*') return `(?<${UNNAMED_PARAM_PREFIX}${i++}>.*)`;
        return `(?<${name.slice(1)}>[^/]+)`;
      })}$`,
    );
  }
}

type Params = Record<string, string>;
declare global {
  interface Window {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1731418
    // https://github.com/WebKit/standards-positions/issues/61
    URLPattern: any;
  }
}

/**
 * - 大小写敏感
 * - 匹配成功时返回 params
 * - 以 `/` 结尾时能不带 `/` 结尾的路径
 * - `*` 匹配到的 params 名称为数字
 *
 * @example
 * ```js
 * matchPath(`/a/b/:c/:d`,`/a/b/1/2`);
 * matchPath(`/a/b/:c/:d`,`/a/b/1/2/`);
 * matchPath(`/a/b/*`,`/a/b/1/2/`);
 * ```
 */
export function matchPath(pattern: string, path: string) {
  if (window.URLPattern) {
    const urLPattern = new window.URLPattern({ pathname: pattern });
    const matchResult = urLPattern.exec({ pathname: path }) || urLPattern.exec({ pathname: `${path}/` });
    if (!matchResult) return null;
    return matchResult.pathname.groups as Params;
  }
  const reg = new ParamsRegExp(pattern);
  const matchResult = path.match(reg) || `${path}/`.match(reg);
  if (!matchResult) return null;
  const params: Params = {};
  if (matchResult.groups) {
    Object.entries(matchResult.groups).forEach(([key, value]) => {
      params[key.startsWith(UNNAMED_PARAM_PREFIX) ? key.slice(1) : key] = value;
    });
  }
  return params;
}

export interface RouteItem<T = unknown> {
  // 支持 *
  // 支持 /a/*
  // 不支持相对路径
  // 不能匹配查询字符串
  pattern: string;
  redirect?: string;
  content?: TemplateResult;
  getContent?: (params: Params) => TemplateResult | Promise<TemplateResult>;
  title?: string;
  // 用来传递数据
  data?: T;
}

export type RoutesObject = Record<string, RouteItem>;

// params 中的成员不会验证
export interface RouteOptions extends Omit<UpdateHistoryParams, 'path'> {
  params?: Params;
}

// 从路由创建路径
// 不包含 basePath
export function createPath(route: RouteItem, options?: RouteOptions) {
  let path = route.pattern;
  const params = options?.params;
  if (params) {
    Object.keys(params).forEach((key) => {
      path = path.replace(new RegExp(`:${key}`, 'g'), params[key]);
    });
  }
  return path;
}

export function createHistoryParams(route: RouteItem, options?: RouteOptions): UpdateHistoryParams {
  const path = createPath(route, options);
  return {
    path,
    ...options,
  };
}

interface ConstructorOptions {
  isLight?: boolean;
  routes?: RouteItem[] | RoutesObject;
}

type State = {
  content?: TemplateResult;
};

export type RouteTrigger = {
  store: Store<any>;
  replace: (arg: UpdateHistoryParams) => void;
  getParams: () => { path: string; query?: string | QueryString; hash?: string };
};

const scrollPositionMap = new Map<string, number>();

/**
 * @attr inert 暂停路由更新
 * @fires routechange
 * @fires error
 * @fires loading
 */
export class GemRouteElement extends GemElement<State> {
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

  /**自动让滚动容器恢复滚动位置 */
  @property scrollContainer?: HTMLElement | (() => HTMLElement);
  /**默认当有 `hash` 时不进行滚动 */
  @property scrollIgnoreHash?: boolean;

  @property trigger: RouteTrigger = history;

  /**当前使用的路由对象 */
  currentRoute: RouteItem | null;
  /**当前匹配的路由的 params */
  currentParams: Params = {};

  #lastLoader?: Promise<TemplateResult>;

  /**不要多个 `<gem-route>` 共享，因为那样会导致后面的元素卸载前触发更新 */
  static createLocationStore = () => {
    const { path, query, hash, data } = history.getParams();
    return createStore({ path, query, hash, data, params: {} as Params });
  };

  static findRoute = (target: RouteItem[] | RoutesObject = [], path: string) => {
    let defaultRoute: RouteItem | null = null;
    let routes: RouteItem[];
    if (target instanceof Array) {
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

  constructor({ isLight, routes }: ConstructorOptions = {}) {
    super({ isLight });
    this.routes = routes;
  }

  state: State = {
    content: undefined,
  };

  #updateLocationStore = () => {
    if (!this.locationStore) return;
    const { path, query, hash, data } = history.getParams();
    updateStore(this.locationStore, {
      path,
      params: this.currentParams,
      query,
      hash,
      data,
    });
  };

  #updateScrollContainerPosition = () => {
    if (!this.#scrollContainer) return;
    const scrollTop = scrollPositionMap.get(history.currentKey);
    if (scrollTop) {
      this.#scrollContainer.scroll(0, scrollTop);
    } else if (this.scrollIgnoreHash || !history.getParams().hash) {
      this.#scrollContainer.scroll(0, 0);
    }
  };

  #setContent = (route: RouteItem | null, params: Params, content?: TemplateResult) => {
    this.beforeroutechange(route);
    this.#lastLoader = undefined;
    this.currentRoute = route;
    this.currentParams = params;
    const changeContent = async () => {
      this.setState({ content });
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

  mounted() {
    this.effect(
      () => {
        if (!this.#scrollContainer) return;
        return addListener(history, 'beforechange', () =>
          scrollPositionMap.set(history.currentKey, this.#scrollContainer!.scrollTop),
        );
      },
      () => [this.scrollContainer],
    );

    this.effect(
      // 触发 this.#update
      () => connect(this.trigger.store, () => this.setState({})),
      () => [this.trigger],
    );

    this.effect(
      ([key, path], old) => {
        // 只有查询参数改变
        if (old && key === old[0] && path === old[1]) {
          this.#updateLocationStore();
          return;
        }
        this.update();
      },
      () => {
        const { path, query, hash } = this.trigger.getParams();
        return [this.key, path, query, hash] as const;
      },
    );
  }

  shouldUpdate() {
    return this.inert ? false : true;
  }

  render() {
    const { content } = this.state;
    if (!this.shadowRoot) return html`${content}`;

    return html`
      <style>
        :host(:where(:not([hidden]))),
        :not(:defined) {
          display: contents;
        }
      </style>
      ${content ?? html`<slot></slot>`}
    `;
  }

  update = () => {
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
      updateStore(titleStore, { title: route?.title });
    }
    const contentOrLoader = content || getContent?.(params);
    this.loading(route);
    if (contentOrLoader instanceof Promise) {
      this.#lastLoader = contentOrLoader;
      const isSomeLoader = () => this.#lastLoader === contentOrLoader;
      contentOrLoader
        .then((content) => {
          if (isSomeLoader()) this.#setContent(route, params, content);
        })
        .catch((err) => {
          if (isSomeLoader()) this.error(err);
        });
      return;
    }
    this.#setContent(route, params, contentOrLoader);
  };
}

export class GemLightRouteElement extends GemRouteElement {
  constructor(options: ConstructorOptions = {}) {
    super({ ...options, isLight: true });
  }
}
