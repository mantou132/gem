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
import { Emitter } from '../lib/decorators';

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
    Object.keys(reg.namePosition).forEach((name) => {
      params[name] = matchResult[reg.namePosition[name] + 1];
    });
    return params;
  }
}

export function isMatch(pattern: string, path: string) {
  return !!path.match(getReg(pattern)) || !!`${path}/`.match(getReg(pattern));
}

export interface RouteItem {
  // 支持 *
  // 支持 /a/*
  // 不支持相对路径
  pattern: string;
  redirect?: string;
  content?: TemplateResult;
  title?: string;
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

/**
 * @customElement gem-route
 * @fires change
 */
@connectStore(history.store)
@customElement('gem-route')
export class GemRouteElement extends GemElement {
  static currentRoute: RouteItem | null;

  // 获取当前匹配的路由的 params
  static getParams() {
    if (GemRouteElement.currentRoute) {
      return getParams(GemRouteElement.currentRoute.pattern, history.getParams().path);
    }
  }

  @property routes: RouteItem[] | RoutesObject;
  @property key: any; // 除了 href 提供另外一种方式来更新
  @emitter change: Emitter<RouteItem | null>;

  private _href: string; // 用于内部比较
  private _key: any; // 用于内部比较

  constructor() {
    super();
    const { path, query } = history.getParams();
    const href = path + query;
    this._href = href;
  }
  initPage() {
    // 路径更新后可能发起第二次更新，更新 `document.title`
    if (
      GemRouteElement.currentRoute &&
      GemRouteElement.currentRoute.title &&
      GemRouteElement.currentRoute.title !== history.getParams().title
    ) {
      history.updateParams({ title: GemRouteElement.currentRoute.title });
    }
  }

  shouldUpdate() {
    const { path, query } = history.getParams();
    const href = path + query;
    if (href !== this._href || this.key !== this._key) {
      this._href = href;
      this._key = this.key;
      return true;
    }
    return false;
  }

  mounted() {
    this._key = this.key;
    this.initPage();
  }

  updated() {
    this.initPage();
    this.change(GemRouteElement.currentRoute);
  }

  render() {
    if (!this.routes) return this.callback();
    GemRouteElement.currentRoute = null;

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
        GemRouteElement.currentRoute = item;
        break;
      }
    }

    if (!GemRouteElement.currentRoute) {
      GemRouteElement.currentRoute = defaultRoute;
    }

    if (!GemRouteElement.currentRoute) return this.callback();
    if (GemRouteElement.currentRoute.redirect) {
      history.replace({ path: GemRouteElement.currentRoute.redirect });
      // 不要渲染空内容，等待重定向结果
      return undefined;
    }
    return html`
      <style>
        :host {
          display: contents;
        }
      </style>
      ${GemRouteElement.currentRoute.content}
    `;
  }

  callback() {
    GemRouteElement.currentRoute = null;
    return html``;
  }
}
