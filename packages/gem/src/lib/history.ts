import { createStore, updateStore, connect } from './store';
import { QueryString, cleanObject, GemError, absoluteLocation } from './utils';

const nativeHistory = window.history;
const nativePushState: typeof nativeHistory.pushState = nativeHistory.pushState.bind(nativeHistory);
const nativeReplaceState: typeof nativeHistory.replaceState = nativeHistory.replaceState.bind(nativeHistory);

let key = 0;
const getKey = () => `${performance.now()}-${++key}`;

export interface HistoryState {
  $hasCloseHandle: boolean;
  $hasOpenHandle: boolean;
  $hasShouldCloseHandle: boolean;
  $key: string;
  [index: string]: any;
}

const store = createStore<HistoryState>({
  $hasCloseHandle: false,
  $hasOpenHandle: false,
  $hasShouldCloseHandle: false,
  $key: '',
});

export interface UpdateHistoryParams {
  title?: string;
  path?: string; // 不包括 basePath，只有根目录储存末尾斜杠
  query?: string | QueryString; // 包含 `?`
  hash?: string; // 包含 `#`
  // 以下为看不见的状态
  open?: () => void; // 按下前进键时执行
  close?: () => void; // 按下返回键时执行
  shouldClose?: () => boolean; // 按下返回键时判断是否执行 close 函数，返回为 false 时不执行，并恢复 history
  data?: any; // 同 history.state
}

// 实际应用值
type HistoryParams = UpdateHistoryParams & { title: string; path: string; query: QueryString; hash: string };

// TODO: WeakRef
const paramsMap = new Map<string, HistoryParams>();

function validData(data: any) {
  const { $key, $hasCloseHandle, $hasOpenHandle, $hasShouldCloseHandle } = data || {};
  if (store.$key === $key) return;
  if ($key) throw new GemError('`$key` is not allowed');
  if ($hasCloseHandle) throw new GemError('`$hasCloseHandle` is not allowed');
  if ($hasOpenHandle) throw new GemError('`$hasOpenHandle` is not allowed');
  if ($hasShouldCloseHandle) throw new GemError('`$hasShouldCloseHandle` is not allowed');
}

function getUrlBarPath(internalPath: string) {
  return gemHistory.basePath ? gemHistory.basePath + internalPath : internalPath;
}

function getInternalPath(urlBarPath: string) {
  if (urlBarPath === gemHistory.basePath) return '/';
  return urlBarPath.replace(new RegExp(`^${gemHistory.basePath}/`), '/');
}

function normalizeParams(params: UpdateHistoryParams): HistoryParams {
  const current = paramsMap.get(store.$key) || ({} as HistoryParams);
  // 没提供 path 使用当前 path
  const path = params.path ? absoluteLocation(current.path, params.path) : getInternalPath(location.pathname);
  // 没提供 query 又没有提供 path 时使用当前 search
  const query = new QueryString(params.query || (params.path ? '' : location.search));
  const pathChanged =
    (params.path && params.path !== current.path) || (params.query && String(params.query) !== String(current.query));
  // 没提供 title 又没有改变 URL 时使用当前 document.title
  const title = params.title || (pathChanged ? '' : document.title);
  const statusChanged = params.close || params.data || params.open || params.shouldClose;
  // 没提供 hash 又没有改变 URL 又不是状态更新时使用当前 hash
  const hash = params.hash || (!pathChanged && statusChanged ? decodeURIComponent(location.hash) : '');
  return { ...params, title, path, query, hash };
}

function updateHistory(p: UpdateHistoryParams, native: typeof nativeHistory.pushState) {
  validData(p.data);
  const params = normalizeParams(p);
  const { title, path, query, hash, close, open, shouldClose, data } = params;
  const state: HistoryState = {
    $hasCloseHandle: !!close,
    $hasOpenHandle: !!open,
    $hasShouldCloseHandle: !!shouldClose,
    $key: getKey(),
    ...data,
  };
  paramsMap.set(state.$key, params);
  updateStore(cleanObject(store), state);
  const url = getUrlBarPath(path) + new QueryString(query) + hash;
  const prevHash = decodeURIComponent(location.hash);
  native(state, title, url);
  if (prevHash !== hash) window.dispatchEvent(new CustomEvent('hashchange'));
}

// 跨框架时，调用者对 basePath 无感知
function updateHistoryByNative(data: any, title: string, originUrl: string, native: typeof nativeHistory.pushState) {
  validData(data);
  const state = {
    $key: getKey(),
    ...(data || {}),
  };
  const { pathname, search, hash } = new URL(originUrl, location.origin + location.pathname);
  const params = normalizeParams({ path: pathname, query: new QueryString(search), hash, title, data });
  paramsMap.set(state.$key, params);
  updateStore(cleanObject(store), state);
  const url = getUrlBarPath(pathname) + params.query + hash;
  const prevHash = location.hash;
  native(state, title, url);
  // `location.hash` 和 `hash` 都已经进行了 url 编码，可以直接进行相等判断
  if (prevHash !== hash) window.dispatchEvent(new CustomEvent('hashchange'));
}

const gemBasePathStore = createStore({
  basePath: '',
});

class GemHistory {
  get store() {
    return store;
  }
  get basePath() {
    return gemBasePathStore.basePath;
  }
  set basePath(basePath: string) {
    // 应用初始化的时候设置
    updateStore(gemBasePathStore, { basePath });
    // paramsMap 更新后 ui 才会更新
    Object.assign(paramsMap.get(store.$key)!, { path: getInternalPath(location.pathname) });
  }
  getParams() {
    return paramsMap.get(store.$key)!;
  }
  updateParams(params: UpdateHistoryParams) {
    Object.assign(paramsMap.get(store.$key)!, params);
    updateStore(store, {});
  }
  push(params: UpdateHistoryParams) {
    updateHistory(params, nativePushState);
  }
  replace(params: UpdateHistoryParams) {
    updateHistory(params, nativeReplaceState);
  }
  pushIgnoreCloseHandle(params: UpdateHistoryParams) {
    if (store.$hasCloseHandle) {
      paramsMap.get(store.$key)?.close?.();
      this.replace(params);
    } else {
      this.push(params);
    }
  }
  forward() {
    nativeHistory.forward();
  }
  back() {
    nativeHistory.back();
  }
}

// `<gem-**>` 只读写父应用 `basePath`
const gemHistory = new GemHistory();

const gemTitleStore = createStore({ title: '' });

const _GEMHISTORY = { history: gemHistory, titleStore: gemTitleStore, basePathStore: gemBasePathStore };

declare global {
  interface Window {
    _GEMHISTORY?: typeof _GEMHISTORY;
  }
}

if (!window._GEMHISTORY) {
  window._GEMHISTORY = _GEMHISTORY;

  nativeHistory.pushState = function (state: any, title: string, path: string) {
    updateHistoryByNative(state, title, path, nativePushState);
  };

  nativeHistory.replaceState = function (state: any, title: string, path: string) {
    updateHistoryByNative(state, title, path, nativeReplaceState);
  };

  // 点击 `<a>`
  window.addEventListener('hashchange', ({ isTrusted }) => {
    if (isTrusted) {
      gemHistory.replace({ hash: decodeURIComponent(location.hash) });
    }
  });

  if (!nativeHistory.state) {
    // 初始化 historyState
    const { pathname, search, hash } = location;
    gemHistory.replace({ path: pathname, query: search, hash });
  } else if (nativeHistory.state.$hasCloseHandle) {
    updateStore(store, nativeHistory.state);
    const params = normalizeParams({ title: document.title });
    paramsMap.set(store.$key, params);
    // 有 handle 返回键的页面刷新需要清除返回 handler
    gemHistory.back();
  } else {
    // 有 gem 历史的正常普通刷新, 储存 params
    const params = normalizeParams({ title: document.title, hash: location.hash });
    updateStore(store, {
      $key: getKey(),
      ...(nativeHistory.state || {}),
    });
    paramsMap.set(store.$key, params);
  }

  connect(gemTitleStore, () => {
    const params = paramsMap.get(store.$key);
    if (params) {
      params.title = gemTitleStore.title;
    }
  });

  connect(store, () => {
    const { title } = gemHistory.getParams();
    if (title !== gemTitleStore.title) {
      updateStore(gemTitleStore, { title });
    }
  });

  /**
   * 表示 popstate handler 中正在进行导航
   */
  let navigating = false;
  window.addEventListener('popstate', (event) => {
    const newState = event.state as HistoryState | null;
    if (!newState?.$key) {
      // 比如作为其他框架 app 的宿主 app
      return;
    }
    if (navigating) {
      navigating = false;
      return;
    }

    // 处理 forward or back
    // replace 不会触发

    // 刷新后再导航需要从当前 state 中构建 params
    // 理论上该条历史记录中不会出现事件处理器
    // 子 app 导航也需要从 state 中构建 params
    if (!paramsMap.has(newState.$key)) {
      const { pathname, search, hash } = location;
      paramsMap.set(newState.$key, {
        path: pathname,
        query: new QueryString(search),
        hash,
        title: document.title, // 浏览器缓存的 title
        data: newState,
      });
    }

    // url 变化前 historyItem
    const prevState = store;
    const isForward = parseFloat(newState.$key) > parseFloat(prevState.$key);
    if (isForward && newState.$hasOpenHandle) {
      // 返回键关闭的 modal 能前进键重新打开
      // 刷新后不能工作：刷新后 historyItem 中只有 url
      // 能在子 app 中工作
      paramsMap.get(newState.$key)?.open?.();
    } else if (prevState.$hasCloseHandle) {
      const prevParams = paramsMap.get(prevState.$key);
      const closeHandle = prevParams?.close;
      const shouldCloseHandle = prevParams?.shouldClose;
      const notAllowClose = shouldCloseHandle && !shouldCloseHandle();
      if (notAllowClose) {
        navigating = true;
        gemHistory.forward(); // 将重新触发 popstate
        return; // 历史记录栈位置没有变化，不需要后面的 updateStore
      } else {
        // handle 返回键
        if (closeHandle) {
          closeHandle();
        } else if (newState.$hasCloseHandle) {
          // 有 modal 的页面刷新会执行 back 触发 popstate
          // 如果是二级 modal 页面刷新
          // 则还需要进行一次 back
          // !!! 不完美：三级 modal 页面刷新不支持返回到初始页面
          navigating = true;
          gemHistory.back();
        }
      }
    }

    updateStore(cleanObject(store), newState);
  });
}

const { history, titleStore, basePathStore } = window._GEMHISTORY;
export { history, titleStore, basePathStore };
