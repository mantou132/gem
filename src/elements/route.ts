import {
  html,
  GemElement,
  customElement,
  connectStore,
  property,
  emitter,
  Emitter,
  history,
  TemplateResult,
  UpdateHistoryParams,
  titleStore,
  updateStore,
  Store,
  QueryString,
  createStore,
} from '../';

interface NamePostition {
  [index: string]: number;
}

// TODO: use `URLPattern`
class ParamsRegExp extends RegExp {
  namePosition: NamePostition;
  constructor(pattern: string) {
    const namePosition: NamePostition = {};
    let i = 0;
    super(
      `^${pattern
        .replace(/:([^/$]+)/g, (_m, name: string) => {
          namePosition[name] = i++;
          return `([^/]+)`;
        })
        .replace('*', '.*')}$`,
      'i',
    );
    this.namePosition = namePosition;
  }
}

type Params = Record<string, string>;

// `/a/b/:c/:d` `/a/b/1/2`
// 匹配成功时返回 params
export function matchPath(pattern: string, path: string) {
  const reg = new ParamsRegExp(pattern);
  const matchResult = path.match(reg) || `${path}/`.match(reg);
  if (!matchResult) return null;
  const params: Params = {};
  if (matchResult) {
    Object.keys(reg.namePosition).forEach((name) => {
      params[name] = matchResult[reg.namePosition[name] + 1];
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

type RoutesObject = Record<string, RouteItem>;

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

/**
 * @customElement gem-route
 * @attr inert 暂停路由更新
 * @fires change
 * @fires error
 * @fires loading
 */
@connectStore(history.store)
@customElement('gem-route')
export class GemRouteElement extends GemElement<State> {
  @property routes?: RouteItem[] | RoutesObject;
  /**
   * @example
   * const locationStore = GemRouteElement.createLocationStore()
   * html`<gem-route .locationStore=${locationStore}>`
   */
  @property locationStore?: Store<{ path: string; params: Params; query: QueryString; data?: any }>;
  @property key: any; // 除了 href 提供另外一种方式来更新，比如语言更新也需要刷新 <gem-route>
  @emitter change: Emitter<RouteItem | null>; // path 改变或者 key 改变，包含初始渲染
  @emitter loading: Emitter<RouteItem>;
  @emitter error: Emitter<any>;

  currentRoute: RouteItem | null;
  // 当前匹配的路由的 params
  currentParams: Params = {};

  #lastLoader?: Promise<TemplateResult>;

  static createLocationStore = () => {
    const { path, query, data } = history.getParams();
    return createStore({ path, query, data, params: {} as Record<string, string> });
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

  constructor({ isLight, routes }: ConstructorOptions = {}) {
    super({ isLight });
    this.routes = routes;
  }

  state: State = {
    content: undefined,
  };

  #updateLocationStore = () => {
    if (this.locationStore) {
      const { path, query, data } = history.getParams();
      updateStore(this.locationStore, {
        path,
        params: this.currentParams,
        query,
        data,
      });
    }
  };

  #setContent = (route: RouteItem | null, params: Params, content?: TemplateResult) => {
    this.#lastLoader = undefined;
    this.currentRoute = route;
    this.currentParams = params;
    this.setState({ content });
    this.change(this.currentRoute);
    const title = route?.title;
    if (title) updateStore(titleStore, { title });
    this.#updateLocationStore();
  };

  mounted() {
    this.effect(
      ([key, path], old) => {
        // 只有查询参数改变
        if (old && key === old[0] && path === old[1]) {
          this.#updateLocationStore();
          return;
        }
        const { route, params = {} } = GemRouteElement.findRoute(this.routes, path);
        const { redirect, content, getContent } = route || {};
        if (redirect) {
          history.replace({ path: redirect });
          return;
        }
        const contentOrLoader = content || getContent?.(params);
        if (contentOrLoader instanceof Promise) {
          this.loading(route!);
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
      },
      () => {
        const { path } = history.getParams();
        return [this.key, path, location.search];
      },
    );
  }

  shouldUpdate() {
    if (this.inert) return false;
    return true;
  }

  render() {
    const { content } = this.state;
    if (!this.shadowRoot) return html`${content}`;

    return html`
      <style>
        :host,
        :not(:defined) {
          display: contents;
        }
      </style>
      ${content}
    `;
  }
}

/**
 * @customElement gem-light-route
 */
@customElement('gem-light-route')
export class GemLightRouteElement extends GemRouteElement {
  constructor(options: ConstructorOptions = {}) {
    super({ ...options, isLight: true });
  }
}
