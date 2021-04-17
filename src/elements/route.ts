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
} from '../';

interface NamePostition {
  [index: string]: number;
}

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

function getReg(pattern: string) {
  return new ParamsRegExp(pattern);
}

// `/a/b/:c/:d` `/a/b/1/2`
function getParams(pattern: string, path: string) {
  const reg = getReg(pattern);
  const matchResult = path.match(reg);
  if (matchResult) {
    const params: { [index: string]: string } = {};
    Object.keys(reg.namePosition).forEach((name) => {
      params[name] = matchResult[reg.namePosition[name] + 1];
    });
    return params;
  }
}

export function isMatch(pattern: string, path: string) {
  return !!path.match(getReg(pattern)) || !!`${path}/`.match(getReg(pattern));
}

export interface RouteItem<T = unknown> {
  // 支持 *
  // 支持 /a/*
  // 不支持相对路径
  pattern: string;
  redirect?: string;
  content?: TemplateResult;
  title?: string;
  // 用来传递数据
  data?: T;
}

export interface RoutesObject {
  [prop: string]: RouteItem;
}

// params 中的成员不会验证
export interface RouteOptions extends Omit<UpdateHistoryParams, 'path'> {
  params?: { [index: string]: string };
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

/**
 * @customElement gem-route
 * @fires change
 */
@connectStore(history.store)
@customElement('gem-route')
export class GemRouteElement extends GemElement {
  @property routes?: RouteItem[] | RoutesObject;
  @property key: any; // 除了 href 提供另外一种方式来更新，比如语言更新也需要刷新 <gem-route>
  @emitter change: Emitter<RouteItem | null>;

  #href: string; // 用于内部比较
  #key: any; // 用于内部比较
  #redirect: boolean;
  #isLight?: boolean;

  currentRoute: RouteItem | null;

  // 获取当前匹配的路由的 params
  getParams() {
    if (this.currentRoute) {
      return getParams(this.currentRoute.pattern, history.getParams().path);
    }
  }

  constructor({ isLight, routes }: ConstructorOptions = {}) {
    super({ isLight });
    this.#isLight = isLight;

    this.routes = routes;

    const { path, query } = history.getParams();
    this.#href = path + query;
  }

  #initPage = () => {
    const title = this.currentRoute?.title;
    if (title) {
      updateStore(titleStore, { title });
    }
  };

  #callback = () => {
    this.currentRoute = null;
    return html``;
  };

  shouldUpdate() {
    if (this.inert) return false;
    const { path, query } = history.getParams();
    const href = path + query;
    if (href !== this.#href || this.key !== this.#key) {
      this.#href = href;
      this.#key = this.key;
      return true;
    }
    return false;
  }

  render() {
    if (!this.routes) return this.#callback();
    const { path } = history.getParams();
    this.currentRoute = null;

    let defaultRoute: RouteItem | null = null;
    let routes: RouteItem[];
    if (this.routes instanceof Array) {
      routes = this.routes;
    } else {
      routes = Object.values(this.routes);
    }

    for (const item of routes) {
      const { pattern } = item;
      if ('*' === pattern) {
        defaultRoute = item;
      } else if (isMatch(pattern, path)) {
        this.currentRoute = item;
        break;
      }
    }

    if (!this.currentRoute) {
      this.currentRoute = defaultRoute;
    }

    if (!this.currentRoute) return this.#callback();

    const { redirect, content } = this.currentRoute;
    if (redirect) {
      this.#redirect = true;
      history.replace({ path: redirect });
      // 不要渲染空内容，等待重定向结果
      return undefined;
    }

    this.#redirect = false;
    return html`
      ${this.#isLight
        ? ''
        : html`
            <style>
              :host {
                display: contents;
              }
            </style>
          `}
      ${content}
    `;
  }

  mounted() {
    this.#key = this.key;
    this.#initPage();
  }

  updated() {
    this.#initPage();
    if (!this.#redirect) {
      this.change(this.currentRoute);
    }
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
