import { connect, createStore, history, QueryString, titleStore } from '@mantou/gem';
import { isolate, isServer } from '@mantou/gem/lib/server';
import { waitServerElements } from '@mantou/gem-ssr/decorators';

import {
  type ActionResult,
  cacheHistoryData,
  clearClientCache,
  type ErrorData,
  fetchServerData,
  getHistoryEntry,
  HttpError,
  isOutdated,
  loadPageElements,
  Redirect,
  type RouteDataFile,
  type RouteError,
  reload,
  requestState,
  runServerLoad,
  setSSRData,
  setSSRError,
  setSSRReady,
  takeSSRData,
  takeSSRError,
  toRouteError,
} from './data';
import { type Meta, updateMeta } from './meta';
import { getPageOptions, type Params } from './page';
import { errorPage, hasServerLoad, type MatchedRoute, matchRoutes, type RouteInfo } from './route';

/**
 * 客户端导航状态，从开始加载 layout 或页面到页面加载完成（或者渲染错误页面），
 * 包括提交表单和 `invalidate()` 后的重新加载，用来显示进度条等
 *
 * @example
 * ```ts
 * @connectStore(navigationStore)
 * class MyLayoutElement extends GemElement {
 *   @template()
 *   #content = () => html`<progress v-if=${navigationStore.pending}></progress><gemkit-outlet></gemkit-outlet>`;
 * }
 * ```
 */
export const navigationStore = createStore({ pending: false });

/**
 * 当前显示的路由，`path` 不包含语言前缀，`params` 是页面的参数；
 * 导航时所有 layout 和页面加载完成后才更新，和它们在同一轮中渲染，服务端渲染时是当前请求的。
 * layout 根据它而不是 `history` 渲染侧边栏等内容，加载期间不会和旧页面不一致
 *
 * @example
 * ```ts
 * @connectStore(routeStore)
 * class MyLayoutElement extends GemElement {
 *   @template()
 *   #content = () => html`<aside v-if=${routeStore.path !== '/'}></aside><gemkit-outlet></gemkit-outlet>`;
 * }
 * ```
 */
export const routeStore = createStore({ path: '', query: new QueryString(), params: {} as Params });

/** 导航中一层路由（layout、页面或者错误页面）加载的结果，`params` 是元素的参数 */
export interface RouteResult {
  info: RouteInfo;
  cls: CustomElementConstructor;
  params: Params;
  data: unknown;
  title?: string;
  meta: Meta;
}

// 已提交（正在显示）的路由，`path` 是提交时的页面路径；不使用 store，避免被当作需要同步的 store 输出
const committed = isolate<{ path?: string; routes: RouteResult[] }>({ routes: [] });

/** 已提交的路由，outlet 渲染其中自己的那一层 */
export const getCommittedRoutes = () => committed.routes;

/** 路径的 layout 和页面（或者错误页面）的 meta，内层的覆盖外层的，只有提交后才有 */
export function getRouteMeta(path: string): Meta {
  if (committed.path !== path) return {};
  return Object.fromEntries(committed.routes.flatMap(({ meta }) => Object.entries(meta))) as Meta;
}

/** 显示中的页面的标题 */
export const getCommittedTitle = () => committed.routes.at(-1)?.title;

/** 子路由间导航时 layout 参数不变就复用已提交的数据 */
function getReusableLayout(tag: string, params: Params) {
  const route = committed.routes.find(({ info }) => info.tag === tag);
  if (route && JSON.stringify(route.params) === JSON.stringify(params)) return route;
}

/** 导航需要请求服务端数据：有服务端 `load` 的页面，或者不能复用数据的 layout */
export const needServerData = (routes: MatchedRoute[], invalidate?: boolean) =>
  routes.some(
    ({ info, params }) => hasServerLoad(info) && (!info.layout || invalidate || !getReusableLayout(info.tag, params)),
  );

/** outlet 所在的 layout 的标签名（根路由为空字符串）在路由中对应的层级，layout 不在其中时为 `-1` */
export function getLevel(owner: string, routes: RouteResult[]) {
  if (!owner) return 0;
  const index = routes.findIndex(({ info }) => info.tag === owner);
  return index === -1 ? -1 : index + 1;
}

type ElementModule = { default: CustomElementConstructor };

// 应用的 i18n，加载模块后等待模块中创建的子模块加载语言包
let i18n: { ready: Promise<unknown> } | undefined;

/** 设置应用的 i18n，加载 layout 和页面模块后等待语言包加载完成再渲染 */
export function setI18n(value: typeof i18n) {
  i18n = value;
}

// 服务端渲染时加载的 layout 和页面（包括错误页面），以及由客户端渲染的路由，水合时客户端会加载它们的模块
const ssrRoutes = isolate<{ tags: string[] }>({ tags: [] });

/** 当前请求中客户端需要加载的 layout 和页面的标签名，文档中预加载它们的 chunk */
export const getSSRRoutes = () => ssrRoutes.tags;

// 已经在客户端导航过，之后加载的 chunk 可能已经被重新部署删除
let navigated = false;

/**
 * 加载 layout 或页面模块，等待模块中的 i18n 子模块加载当前语言包；
 * 导航时 chunk 加载失败通常是重新部署删除了旧的 chunk，重新加载页面；
 * 首次加载时是部署本身的问题，离线时是网络的问题，重新加载也会失败，渲染错误页面
 */
async function loadModule({ load, tag }: RouteInfo) {
  if (isServer) ssrRoutes.tags = [...ssrRoutes.tags, tag];
  let mod: ElementModule;
  try {
    mod = await load();
  } catch (err) {
    if (navigated && navigator.onLine && isOutdated(err)) return reload();
    throw err;
  }
  await i18n?.ready;
  return mod.default;
}

/** 页面和 layout 的标签名由文件路径生成，加载模块后定义默认导出的元素 */
export function defineElement(tag: string, cls: CustomElementConstructor) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
}

/** 一次导航，加载路径匹配的所有路由，全部完成后一起提交 */
interface Navigation {
  path: string;
  query: QueryString;
  routes: MatchedRoute[];
  /** 开始导航时的历史记录，缓存数据和恢复滚动位置使用 */
  key: string;
  /** 不复用 layout 的数据，提交表单或者 `invalidate()` 后 */
  invalidate?: boolean;
  /** 加载前就确定出错的路由，例如 `handle`、action 的错误，在它的位置渲染错误页面 */
  error?: RouteError;
  /** 服务端数据，layout 和页面共用一个请求 */
  serverData?: Promise<RouteDataFile>;
  /** 所有层级渲染后 resolve，被新的导航取代时跟随新的导航，没有错误页面时加载出错 reject */
  done: PromiseWithResolvers<void>;
}

const navigation = isolate<{ current?: Navigation }>({});

/** 客户端通过数据文件获取服务端数据，同一次导航只请求一次 */
async function loadServerData(nav: Navigation, tag: string, params: Params) {
  if (isServer) return runServerLoad(tag, params);
  nav.serverData ||= fetchServerData(nav.path, String(nav.query));
  const { data, error } = await nav.serverData;
  if (error?.tag === tag) throw new HttpError(error.status, error.message);
  return data[tag];
}

/** 执行 `load` 获取数据，水合时使用服务端渲染的数据 */
async function runLoad(nav: Navigation, cls: CustomElementConstructor, info: RouteInfo, params: Params) {
  const { path } = nav;
  const ssrResult = isServer ? undefined : takeSSRData(path, info.tag);
  if (ssrResult) return ssrResult.data;
  const { load } = getPageOptions(cls);
  const serverLoad = hasServerLoad(info);
  if (!load && !serverLoad) return;
  const serverData = serverLoad ? await loadServerData(nav, info.tag, params) : undefined;
  const data = load ? await load({ params, data: serverData }) : serverData;
  // 服务端模块的数据已经转换过
  return setSSRData(path, info.tag, data, !load);
}

/** 前进后退时使用离开时的数据，不再执行 `load` */
async function loadData(nav: Navigation, cls: CustomElementConstructor, info: RouteInfo, params: Params) {
  const { error, key } = nav;
  if (error?.tag === info.tag) throw new HttpError(error.status, error.message);
  if (isServer) return runLoad(nav, cls, info, params);
  const cached = getHistoryEntry(key)?.data;
  if (cached && info.tag in cached) return cached[info.tag];
  const data = await runLoad(nav, cls, info, params);
  cacheHistoryData(key, info.tag, data);
  return data;
}

/** 加载一层路由的模块、数据、标题和 meta，`error` 表示渲染错误页面 */
async function loadRoute(nav: Navigation, { info, params }: MatchedRoute, error?: ErrorData): Promise<RouteResult> {
  const cls = await loadModule(info);
  const reused = info.layout && !nav.invalidate && getReusableLayout(info.tag, params);
  const data = error || (reused ? reused.data : await loadData(nav, cls, info, params));
  const ctx = { params, data };
  const { title, meta } = getPageOptions(cls);
  return {
    info,
    cls,
    params,
    data,
    title: typeof title === 'function' ? await title(ctx) : title,
    meta: (typeof meta === 'function' ? await meta(ctx) : meta) || {},
  };
}

/**
 * `ssr = false` 的路由在服务端只输出空的 outlet，由客户端加载和渲染，
 * 它和子路由（也不在服务端渲染）的服务端 `load` 仍然在服务端执行，数据输出到文档中，水合时不需要再请求；
 * 返回最外层的错误，由客户端渲染错误页面，响应使用它的状态码
 */
async function loadClientRoutes(path: string, routes: MatchedRoute[]) {
  ssrRoutes.tags = [...ssrRoutes.tags, ...routes.map(({ info }) => info.tag)];
  const errors = await Promise.all(
    routes.map(async ({ info, params }) => {
      if (!hasServerLoad(info)) return;
      try {
        setSSRData(path, info.tag, await runServerLoad(info.tag, params), true);
      } catch (err) {
        return toRouteError(info.tag, err);
      }
    }),
  );
  return errors.find(Boolean);
}

const NOT_FOUND: ErrorData = { status: 404, message: 'Not Found' };

/**
 * 并行加载路径匹配的所有路由，最外层出错的路由的位置渲染错误页面，更内层的不再渲染，
 * 没有错误页面时出错，跳转不是错误，直接抛出；服务端只加载服务端渲染的路由
 */
async function loadRoutes(nav: Navigation) {
  const { path, routes } = nav;
  const clientIndex = isServer ? routes.findIndex(({ info }) => info.ssr === false) : -1;
  const serverRoutes = clientIndex === -1 ? routes : routes.slice(0, clientIndex);
  const clientError = clientIndex !== -1 && loadClientRoutes(path, routes.slice(clientIndex));
  const loading = serverRoutes.map((route) =>
    route.info === errorPage ? loadRoute(nav, { ...route, params: {} }, NOT_FOUND) : loadRoute(nav, route),
  );
  // 出错后不再等待更内层的路由，忽略它们的错误
  for (const promise of [...loading, clientError]) if (promise) promise.catch(() => {});
  const loaded: RouteResult[] = [];
  for (const [index, promise] of loading.entries()) {
    try {
      loaded.push(await promise);
    } catch (reason) {
      if (!errorPage) throw reason;
      const { info, params } = serverRoutes[index];
      const error = toRouteError(info.tag, reason);
      setSSRError(path, error);
      const { status, message } = error;
      return [...loaded, await loadRoute(nav, { info: errorPage, params }, { status, message })];
    }
  }
  const error = await clientError;
  if (error) setSSRError(path, error);
  return loaded;
}

/**
 * 提交导航：更新标题、meta 和 `routeStore`，挂载的 outlet 和根据 `routeStore` 渲染的 layout 在同一轮中更新
 */
function commit({ path, query }: Navigation, routes: RouteResult[]) {
  const page = routes.at(-1);
  // 没有标题的页面使用网站标题
  titleStore({ title: page?.title });
  routeStore({ path, query, params: page && !page.info.layout ? page.params : {} });
  committed.path = path;
  committed.routes = routes;
  for (const outlet of outlets) outlet.update();
  if (!isServer) updateMeta(getRouteMeta(path));
  // 水合时定义元素后立即升级，在更新 `routeStore` 之后
  for (const { info, cls } of routes) defineElement(info.tag, cls);
  setSSRReady();
}

/** 挂载的 outlet，`owner` 是所在的 layout 的标签名，根路由为空字符串 */
type Outlet = {
  transition: boolean;
  owner: string;
  getScrollContainer: () => Element | null | undefined;
  update: () => void;
};

const outlets = new Set<Outlet>();

/** outlet 挂载时注册，提交时更新，用来判断导航是否使用视图过渡和恢复页面的滚动位置，返回注销的函数 */
export function addOutlet(outlet: Outlet) {
  outlets.add(outlet);
  return () => outlets.delete(outlet);
}

/** 新的路由链上有 outlet 使用视图过渡，水合时（第一次提交）不使用 */
const useTransition = (routes: RouteResult[]) =>
  committed.path !== undefined &&
  'startViewTransition' in document &&
  [...outlets].some(({ transition, owner }) => transition && getLevel(owner, routes) !== -1);

/**
 * 提交并等待所有层级渲染，已经开始新的导航时不再提交，保持原来的内容；
 * 使用视图过渡时整个提交在一个过渡中，旧的画面是完整的原来的页面，新的画面是所有层级渲染后的
 */
async function render(nav: Navigation, routes: RouteResult[]) {
  const apply = async () => {
    if (navigation.current !== nav) return;
    commit(nav, routes);
    // outlet 和 layout 在提交时安排的微任务中渲染，其中新创建的元素同步渲染
    await Promise.resolve();
  };
  if (!isServer && useTransition(routes)) await document.startViewTransition(apply).updateCallbackDone;
  else await apply();
}

// 历史记录离开时页面的滚动位置，key 是历史记录的 key
const scrollPositions = new Map<string, number>();
// 导航到了新的历史记录，而不是前进后退
let pushed = false;
// 已经处理过滚动的历史记录，同一条历史记录重新渲染时保持滚动位置
let scrolledKey: string | undefined;

/** 渲染页面的 outlet 的滚动容器 */
function getPageScrollContainer() {
  const { routes } = committed;
  for (const { owner, getScrollContainer } of outlets) {
    if (getLevel(owner, routes) === routes.length - 1) return getScrollContainer();
  }
}

function rememberScrollPosition() {
  // 前进和后退时浏览器的历史记录已经改变，Gem 的还没有改变
  pushed = globalThis.history.state?.$key === history.currentKey;
  const container = getPageScrollContainer();
  if (container) scrollPositions.set(history.currentKey, container.scrollTop);
}

/** 页面渲染后恢复滚动位置，导航到新的历史记录时滚动到顶部 */
async function restoreScrollPosition({ key }: Navigation) {
  const container = getPageScrollContainer();
  if (!container || key === scrolledKey) return;
  scrolledKey = key;
  const scrollTop = scrollPositions.get(key);
  if (!pushed && scrollTop !== undefined) {
    // 等待纯服务端元素撑开页面
    await waitServerElements();
    if (key === history.currentKey) container.scroll(0, scrollTop);
    return;
  }
  // 前进、后退或者页面加载时位置未知（例如刷新后），保持浏览器恢复的位置，浏览器只恢复文档的滚动位置
  if (!pushed && container === document.scrollingElement) return;
  if (!history.getParams().hash) container.scroll(0, 0);
}

/** 加载、提交并渲染，被新的导航取代时停止 */
async function run(nav: Navigation) {
  const isCurrent = () => navigation.current === nav;
  try {
    const routes = await loadRoutes(nav);
    if (!isCurrent()) return;
    await render(nav, routes);
    if (!isCurrent()) return;
    if (!isServer) {
      restoreScrollPosition(nav);
      navigationStore({ pending: false });
    }
    nav.done.resolve();
  } catch (err) {
    if (!isCurrent()) return;
    // 替换当前导航
    if (!isServer && err instanceof Redirect) return navigate(err.location, { replace: true });
    if (!isServer) navigationStore({ pending: false });
    nav.done.reject(err);
  }
}

/** 开始导航到当前地址，取代进行中的导航 */
function startNavigation(options: Pick<Navigation, 'invalidate' | 'error'> = {}) {
  const { path, query } = history.getParams();
  // 已经知道出错的路由时，不再加载更内层的路由
  const matched = matchRoutes(path);
  const errorIndex = matched.findIndex(({ info }) => info.tag === options.error?.tag);
  const routes = errorIndex === -1 ? matched : matched.slice(0, errorIndex + 1);
  const nav: Navigation = { path, query, routes, key: history.currentKey, ...options, done: Promise.withResolvers() };
  // 没有人等待时忽略错误，例如没有错误页面时点击链接导航
  nav.done.promise.catch(() => {});
  const prev = navigation.current;
  navigation.current = nav;
  if (!isServer) {
    navigationStore({ pending: true });
    if (prev) {
      navigated = true;
      prev.done.resolve(nav.done.promise);
      // 不使用缓存时，服务端数据和纯服务端元素与模块并行请求
      if (!getHistoryEntry(nav.key)) {
        if (needServerData(routes, nav.invalidate)) {
          nav.serverData = fetchServerData(path, String(query));
          nav.serverData.catch(() => {});
        }
        loadPageElements();
      }
    }
  }
  run(nav);
  return nav.done.promise;
}

/**
 * 服务端渲染时加载当前请求的路由，第一个 outlet 开始，所有层级渲染后完成，
 * 渲染外壳页面时不加载
 */
export function loadServerRoutes() {
  if (requestState.shell) return Promise.resolve();
  return navigation.current?.done.promise || startNavigation({ error: requestState.error });
}

/** 客户端开始路由：水合服务端渲染的页面，路径或者查询参数改变时导航，记录和恢复页面的滚动位置 */
export function startRouter() {
  history.addEventListener('beforechange', rememberScrollPosition);
  connect(history.store, () => {
    const { path, query } = history.getParams();
    const { current } = navigation;
    // 只有 hash 或者历史记录的状态改变
    if (current && path === current.path && String(query) === String(current.query)) return;
    startNavigation();
  });
  startNavigation({ error: takeSSRError(history.getParams().path) });
}

/**
 * 客户端跳转到 `href`，语言（`basePath`）不同时重新加载页面，和当前地址相同时重新加载路由，
 * 页面渲染后 resolve；`invalidate` 时不使用缓存，`error` 是需要渲染错误页面的路由
 */
export function navigate(
  href: string,
  { replace, ...options }: { replace?: boolean } & Pick<Navigation, 'invalidate' | 'error'> = {},
) {
  if (options.invalidate) clearClientCache();
  const { origin, pathname, search, hash } = new URL(href, location.href);
  const { basePath } = history;
  if (origin !== location.origin || (basePath && pathname !== basePath && !pathname.startsWith(`${basePath}/`))) {
    location.assign(href);
    return new Promise<void>(() => {});
  }
  const path = pathname.slice(basePath.length) || '/';
  const current = history.getParams();
  // `QueryString` 的字符串包含 `?`，统一成 `URLSearchParams` 再比较
  if (path !== current.path || String(new URLSearchParams(search)) !== String(new URLSearchParams(current.query))) {
    history[replace ? 'replace' : 'push']({ path, query: search, hash });
  }
  // 历史记录的监听器在之后的微任务中执行，地址已经和这次导航一致，不会再开始导航
  return startNavigation(options);
}

/**
 * 重新加载当前页面和 layout 的数据，不刷新页面，页面元素会被复用，例如调用 API 修改数据后，
 * 预取的结果和历史缓存都不再使用，页面渲染后 resolve，没有错误页面时加载出错 reject
 *
 * @example
 * ```ts
 * await apis.api.likes(slug).POST({ count: 1 });
 * await invalidate();
 * ```
 */
export function invalidate() {
  return navigate(location.href, { replace: true, invalidate: true });
}

/**
 * 不刷新页面提交表单到 `actions`，提交的地址是表单（或者 `submitter`）的 `action`，例如 `?/login`
 *
 * 跳转时客户端导航，出错时渲染错误页面，否则重新加载当前页面的数据，页面渲染后返回 action 的返回值，
 * 请求期间表单有 `aria-busy` 属性，例如 `form[aria-busy] button { opacity: 0.5 }`
 *
 * @example
 * ```ts
 * html`<form method="post" action="?/login" @submit=${this.#submit}></form>`;
 *
 * #submit = async (evt: SubmitEvent) => {
 *   evt.preventDefault();
 *   this.#state({ errors: await submitAction(evt.target as HTMLFormElement, evt.submitter) });
 * };
 * ```
 */
export async function submitAction(form: HTMLFormElement, submitter?: HTMLElement | null) {
  const action = submitter?.getAttribute('formaction') ? (submitter as HTMLButtonElement).formAction : form.action;
  form.ariaBusy = 'true';
  const res = await fetch(action, {
    method: 'POST',
    headers: { accept: 'application/json' },
    body: new FormData(form, submitter),
  }).finally(() => (form.ariaBusy = null));
  if (!res.ok) throw new Error(`gemkit: failed to submit \`${action}\``);
  const result: ActionResult = await res.json();
  // 提交后 cookie 等状态可能改变，之前的数据都不能再使用
  if (result.type === 'redirect') {
    await navigate(result.location, { invalidate: true });
    return;
  }
  const error = result.type === 'error' ? result.error : undefined;
  await navigate(location.href, { replace: true, invalidate: true, error });
  return result.type === 'success' ? result.data : undefined;
}

/** `formActions` 的 action，参数是提交后的回调，返回值作为表单的剩余属性 */
export type FormActions<A> = {
  [K in keyof A & string]: (
    callback?: (
      data: (A[K] extends (...args: any) => infer R ? Awaited<R> : never) | undefined,
      form: HTMLFormElement,
    ) => void,
  ) => { method: 'post'; action: string; onsubmit: (evt: SubmitEvent) => void };
};

/**
 * 使用 `*.server.ts` 中 `actions` 的类型，得到表单的剩余属性，提交时调用 `submitAction`，
 * 回调的参数是 action 的结果（跳转或者出错时是 `undefined`）和表单
 *
 * @example
 * ```ts
 * import type { actions } from './login.server';
 *
 * const { login } = formActions<typeof actions>();
 *
 * html`<form ${login((data) => this.#state({ errors: data?.errors }))}></form>`;
 * ```
 */
export function formActions<A>() {
  return new Proxy({} as FormActions<A>, {
    get: (_, name: string) => (callback?: (data: unknown, form: HTMLFormElement) => void) => ({
      method: 'post',
      action: `?/${name}`,
      onsubmit: async (evt: SubmitEvent) => {
        evt.preventDefault();
        const form = evt.target as HTMLFormElement;
        // 不能写成 `callback?.(await submitAction(...))`，没有回调时参数不会执行
        const data = await submitAction(form, evt.submitter);
        callback?.(data, form);
      },
    }),
  });
}
