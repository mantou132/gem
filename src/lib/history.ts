import { createStore, updateStore } from './store';
import { Storage, QueryString } from './utils';

export interface HistoryItemState {
  $close: boolean;
  $open: boolean;
  $shouldClose: boolean;
  $key: number;
  [index: string]: any;
}
export interface HistoryItem {
  path: string;
  query: string | QueryString;
  hash: string;
  title: string;
  state: HistoryItemState;
}

export interface HistoryStore {
  list: HistoryItem[];
  currentIndex: number;
}

const historyState = createStore<HistoryStore>({
  list: [{}] as HistoryItem[],
  currentIndex: 0,
});

const openHandleMap = new WeakMap<HistoryItemState, Function>();
const colseHandleMap = new WeakMap<HistoryItemState, Function>();
const shouldCloseHandleMap = new WeakMap<HistoryItemState, Function>();

function generateState(data: any, open: Function, close: Function, shouldClose: Function): HistoryItemState {
  if (data.$key) throw new Error('`$key` is not allowed');
  if (data.$open) throw new Error('`$open` is not allowed');
  if (data.$close) throw new Error('`$close` is not allowed');
  if (data.$shouldClose) throw new Error('`$shouldClose` is not allowed');

  const state: HistoryItemState = {
    ...data,
    $key: Date.now() + performance.now(),
    $open: !!open,
    $close: !!close,
    $shouldClose: !!shouldClose,
  };
  openHandleMap.set(state, open);
  colseHandleMap.set(state, close);
  shouldCloseHandleMap.set(state, shouldClose);
  return state;
}

export interface Location {
  path?: string;
  query?: string | QueryString;
  title?: string;
  hash?: string;
  open?: Function; // 按下前进键时执行
  close?: Function; // 按下返回键时执行
  shouldClose?: () => boolean; // 按下返回键时判断是否执行 close 函数，返回为 false 时不执行，并恢复 history
  data?: any;
}

let basePath = '';

let history = {
  historyState,

  get basePath() {
    return basePath;
  },

  set basePath(v) {
    const { list, currentIndex } = historyState;
    // 应用初始化的时候设置
    const location = list[currentIndex];
    location.path = window.location.pathname.replace(new RegExp(`^${v}`), '');
    updateStore(historyState, {});
    basePath = v;
  },

  get location() {
    const { list, currentIndex } = historyState;
    const location = list[currentIndex];
    return {
      get query() {
        return new QueryString(location.query);
      },
      hash: location.hash,
      path: location.path,
      state: location.state,
      title: location.title,
    };
  },
  forward() {
    window.history.forward();
  },
  back() {
    window.history.back();
  },
  push(options: Location) {
    const { path, open, close, shouldClose } = options;
    const query = options.query || '';
    const hash = options.hash || '';
    const title = options.title || '';
    const data = options.data || {};

    const state = generateState(data, open, close, shouldClose);

    window.history.pushState(state, title, history.basePath + path + new QueryString(query) + hash);

    const { list, currentIndex } = historyState;
    if (hash !== list[currentIndex].hash) window.dispatchEvent(new CustomEvent('hashchange'));

    const newList = list.slice(0, currentIndex + 1).concat({
      state,
      title,
      path,
      query,
      hash,
    });
    updateStore(historyState, {
      list: newList,
      currentIndex: newList.length - 1,
    });
  },
  // push 一条历史记录
  // 有 close 处理函数时先执行 closeHandle 在 replace
  // 比如在 modal 打开时跳转页面
  // 不完美：只支持在 1 级 modal 中切换页面
  pushWithoutCloseHandle(options: Location) {
    const { list, currentIndex } = historyState;
    const { state } = list[currentIndex];
    if (state.$close) {
      const closeHandle = colseHandleMap.get(state);
      closeHandle();
      history.replace(options);
    } else {
      history.push(options);
    }
  },
  // 修改 url 意外的状态
  pushState(options: Location) {
    const { list, currentIndex } = historyState;
    const { path, query, hash } = list[currentIndex];
    history.push({
      path,
      query,
      hash,
      ...options,
    });
  },
  replace(options: Location) {
    const { path, open, close, shouldClose } = options;
    const query = options.query || '';
    const hash = options.hash || '';
    const data = options.data || {};
    const title = options.title || '';

    const state = generateState(data, open, close, shouldClose);

    window.history.replaceState(state, title, history.basePath + path + new QueryString(query) + hash);

    const { list, currentIndex } = historyState;
    if (hash !== list[currentIndex].hash) window.dispatchEvent(new CustomEvent('hashchange'));

    list.splice(currentIndex, 1, {
      state,
      title,
      path,
      query,
      hash,
    });
    updateStore(historyState, {
      list,
    });
  },
  // 修改 url 意外的状态
  replaceState(options: Location) {
    const { list, currentIndex } = historyState;
    const { path, query, hash } = list[currentIndex];
    history.replace({
      path,
      query,
      hash,
      ...options,
    });
  },
};

declare global {
  interface Window {
    __gemHistory: typeof history;
  }
}

const hasOtherHistory = !!window.__gemHistory;

if (hasOtherHistory) {
  history = window.__gemHistory;
  const basePath = history.basePath;
  Object.defineProperty(history, 'basePath', {
    get() {
      return basePath;
    },
    set() {
      throw new Error('已经有其他环境使用 gem , 会共享 history 对象，禁止再修改 history 对象');
    },
  });
} else {
  window.__gemHistory = history;

  if (!window.history.state) {
    // 初始化 historyItem[]
    const { pathname, search, hash } = window.location;
    history.replace({ path: pathname, query: search, hash });
  } else if (window.history.state.$close) {
    // 有 handle 返回键的页面刷新
    history.back();
  }

  const storage = new Storage<typeof historyState>();
  const sessionStorageKey = 'gem@historyStateList';
  updateStore(historyState, storage.getSession(sessionStorageKey));

  window.addEventListener('unload', () => {
    storage.setSession(sessionStorageKey, historyState);
  });

  /**
   * 表示 popstate handler 中正在进行导航
   */
  let navigating = false;
  window.addEventListener('popstate', event => {
    if (!event.state || !event.state.$key) {
      // 比如作为其他 app 的宿主 app
      return;
    }
    if (navigating) {
      navigating = false;
      return;
    }

    // forward or back
    // replace 不会触发

    // url 变化前 historyItem
    const { list, currentIndex } = historyState;

    const { state: prevState } = list[currentIndex];
    const newStateIndex = list.findIndex(({ state }) => state.$key === event.state.$key);

    // gem app 嵌套 gem app，且不是同一个 history 对象时
    if (newStateIndex === -1) return;

    const { state: newState } = list[newStateIndex];

    if (newStateIndex > currentIndex && newState.$open) {
      // 返回键关闭的 modal 能前进键重新打开
      // 刷新后不能工作：刷新后 historyItem 中只有 url
      const openHandle = openHandleMap.get(newState);
      if (openHandle) openHandle();
    } else if (prevState.$close) {
      const closeHandle = colseHandleMap.get(prevState);
      const shouldCloseHandle = shouldCloseHandleMap.get(prevState);
      const notAllowClose = shouldCloseHandle && !shouldCloseHandle();
      if (notAllowClose) {
        navigating = true;
        history.forward(); // 将重新触发 popstate
        return; // 历史记录栈位置没有变化，不需要后面的 updateStore
      } else {
        // handle 返回键
        if (closeHandle) {
          closeHandle();
        } else {
          // 有 modal 的页面刷新会执行 back 触发 popstate
          // 如果是耳机 modal 页面刷新
          // 则还需要进行一次 back
          // 不完美：三级 modal 页面刷新不支持返回到初始页面
          navigating = true;
          history.back();
        }
      }
    }

    updateStore(historyState, {
      currentIndex: newStateIndex,
    });
  });
}

export { history };
