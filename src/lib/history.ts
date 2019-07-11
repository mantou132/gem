import { createStore, updateStore } from './store';
import { Storage, QueryString } from './utils';

export interface HistoryItemState {
  $close: boolean;
  $shouldClose: boolean;
  $key: number;
  [index: string]: any;
}
export interface HistoryItem {
  path: string;
  query: string | QueryString;
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

const colseHandleMap = new WeakMap<HistoryItemState, Function>();
const shouldCloseHandleMap = new WeakMap<HistoryItemState, Function>();

function generateState(data: any, close: Function, shouldClose?: Function): HistoryItemState {
  if (data.$key) throw new Error('`$key` is not allowed');
  if (data.$close) throw new Error('`$close` is not allowed');
  if (data.$shouldClose) throw new Error('`$shouldClose` is not allowed');

  const state: HistoryItemState = {
    ...data,
    $key: Date.now() + performance.now(),
    $close: !!close,
    $shouldClose: !!shouldClose,
  };
  colseHandleMap.set(state, close);
  shouldCloseHandleMap.set(state, shouldClose);
  return state;
}

export interface NavigationParameter {
  path?: string;
  query?: string | QueryString;
  title?: string;
  close?: Function; // 按下返回键时执行
  shouldClose?: () => boolean; // 按下返回键时判断是否执行 close 函数，返回为 false 时不执行，并恢复 history
  data?: any;
}

export const history = {
  historyState,
  basePath: '',

  get location() {
    const { list, currentIndex } = historyState;
    const location = list[currentIndex];
    return {
      get query() {
        return new QueryString(location.query);
      },
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
  push(options: NavigationParameter) {
    const { path, close, shouldClose } = options;
    const query = options.query || '';
    const title = options.title || '';
    const data = options.data || {};

    const state = generateState(data, close, shouldClose);

    window.history.pushState(state, title, history.basePath + path + new QueryString(query));

    const { list, currentIndex } = historyState;
    const newList = list.slice(0, currentIndex + 1).concat({
      state,
      title,
      path,
      query,
    });
    updateStore(historyState, {
      list: newList,
      currentIndex: newList.length - 1,
    });
  },
  // push 一条历史记录
  // 有 close 处理函数时先执行 closeHandle 在 replace
  // 比如在 modal 打开时跳转页面
  pushWithoutCloseHandle(options: NavigationParameter) {
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
  pushState(options: NavigationParameter) {
    const { list, currentIndex } = historyState;
    const { path, query } = list[currentIndex];
    history.push({
      path,
      query,
      ...options,
    });
  },
  replace(options: NavigationParameter) {
    const { path, close, shouldClose } = options;
    const query = options.query || '';
    const data = options.data || {};
    const title = options.title || '';

    const state = generateState(data, close, shouldClose);

    window.history.replaceState(state, title, history.basePath + path + new QueryString(query));

    const { list, currentIndex } = historyState;
    list.splice(currentIndex, 1, {
      state,
      title,
      path,
      query,
    });
    updateStore(historyState, {
      list,
    });
  },
  // 修改 url 意外的状态
  replaceState(options: NavigationParameter) {
    const { list, currentIndex } = historyState;
    const { path, query } = list[currentIndex];
    history.replace({
      path,
      query,
      ...options,
    });
  },
};

if (!window.history.state) {
  // 初始化 historyItem[]
  const { pathname, search } = window.location;
  history.replace({ path: pathname, query: search });
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

  if (prevState.$close) {
    const closeHandle = colseHandleMap.get(prevState);
    const shouldCloseHandle = shouldCloseHandleMap.get(prevState);
    const notAllowClose = shouldCloseHandle && !shouldCloseHandle();
    if (notAllowClose) {
      navigating = true;
      history.forward(); // 将重新触发 popstate
      return;
    } else {
      if (closeHandle) {
        // handle 返回键
        // 不完美：这里将留下一条无意义的可供前进的历史记录
        closeHandle();
      } else {
        // 有 handle 返回键的页面刷新后自动触发 popstate 事件
        // 不执行任何动作
      }
    }
  }

  updateStore(historyState, {
    currentIndex: newStateIndex,
  });
});
