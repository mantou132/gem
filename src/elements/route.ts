import {
  html,
  GemElement,
  customElement,
  connectStore,
  property,
  emitter,
  history,
  TemplateResult,
  UpdateHistoryParams,
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
    Object.keys(reg.namePosition).forEach(name => {
      params[name] = matchResult[reg.namePosition[name] + 1];
    });
    return params;
  }
}

export function isMatch(pattern: string, path: string) {
  return !!path.match(getReg(pattern));
}

export interface RouteItem {
  // 支持 *
  // 支持 /a/*
  pattern: string;
  redirect?: string;
  content?: TemplateResult;
  title?: string;
}

export interface RoutesObject {
  [prop: string]: RouteItem;
}

// params 中的成员不会验证
export type RouteOptions = Omit<UpdateHistoryParams, 'path'> & { params: { [index: string]: string } };

// 从路由创建路径
// 不包含 basePath
export function createPath(route: RouteItem, options?: RouteOptions) {
  let path = route.pattern;
  if (options && options.params) {
    Object.keys(options.params).forEach(param => {
      path = path.replace(new RegExp(`:${param}`, 'g'), options.params[param]);
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

/**
 * @customElement gem-route
 * @fires change
 */
@connectStore(history.store)
@customElement('gem-route')
export class Route extends GemElement {
  static currentRoute: RouteItem | null;

  // 获取当前匹配的路由的 params
  static getParams() {
    if (Route.currentRoute) {
      return getParams(Route.currentRoute.pattern, history.getParams().path);
    }
  }

  @property routes: RouteItem[] | RoutesObject;
  @emitter change: Function;

  private _href: string; // 用于内部比较

  constructor() {
    super();
    const { path, query } = history.getParams();
    const href = path + query;
    this._href = href;
  }
  initPage() {
    // 路径更新后可能发起第二次更新，更新 `document.title`
    if (Route.currentRoute && Route.currentRoute.title && Route.currentRoute.title !== history.getParams().title) {
      history.updateParams({ title: Route.currentRoute.title });
    }
  }

  shouldUpdate() {
    const { path, query } = history.getParams();
    const href = path + query;
    if (href !== this._href) {
      this._href = href;
      return true;
    }
    return false;
  }

  mounted() {
    this.initPage();
  }

  updated() {
    this.initPage();
    this.change(Route.currentRoute);
  }

  render() {
    if (!this.routes) return this.callback();
    Route.currentRoute = null;

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
      } else if (isMatch(pattern, history.getParams().path)) {
        Route.currentRoute = item;
        break;
      }
    }

    if (!Route.currentRoute) {
      Route.currentRoute = defaultRoute;
    }

    if (!Route.currentRoute) return this.callback();
    if (Route.currentRoute.redirect) {
      history.replace({ path: Route.currentRoute.redirect });
      return this.callback();
    }
    return html`
      <style>
        :host {
          display: contents;
        }
      </style>
      ${Route.currentRoute.content}
    `;
  }

  callback() {
    Route.currentRoute = null;
    return html``;
  }
}
