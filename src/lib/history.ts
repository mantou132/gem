import { createStore, updateStore } from './store'
import { Storage, QueryString } from './utils'

export interface HistoryItemState {
  $close: boolean
  $key: number
  [index: string]: any
}
export interface HistoryItem {
  path: string
  query: string | QueryString
  title: string
  state: HistoryItemState
}

export interface HistoryStore {
  list: HistoryItem[]
  currentIndex: number
}

const historyState = createStore<HistoryStore>({
  list: [],
  currentIndex: -1,
})

const colseHandleMap = new WeakMap<HistoryItemState, Function>()

function generateState(data: any, close: Function): HistoryItemState {
  if (data.$key) throw new Error('`$key` is not allowed')
  if (data.$close) throw new Error('`$close` is not allowed')

  const state: HistoryItemState = {
    ...data,
    $key: Date.now() + performance.now(),
    $close: !!close,
  }
  colseHandleMap.set(state, close)
  return state
}

export interface NavigationParameter {
  path?: string
  query?: string | QueryString
  title?: string
  close?: Function
  data?: any
}

export const history = {
  historyState,
  basePath: '',

  get location() {
    const { list, currentIndex } = historyState
    const location = list[currentIndex]
    return {
      get query() {
        return new QueryString(location.query)
      },
      path: location.path,
      state: location.state,
      title: location.title,
    }
  },
  forward() {
    window.history.forward()
  },
  back() {
    window.history.back()
  },
  push(options: NavigationParameter) {
    const { path, close } = options
    const query = options.query || ''
    const title = options.title || ''
    const data = options.data || {}

    const state = generateState(data, close)

    window.history.pushState(state, title, history.basePath + path + new QueryString(query))

    const { list, currentIndex } = historyState
    const newList = list.slice(0, currentIndex + 1).concat({
      state,
      title,
      path,
      query,
    })
    updateStore(historyState, {
      list: newList,
      currentIndex: newList.length - 1,
    })
  },
  // 修改 url 意外的状态
  pushState(options: NavigationParameter) {
    const { list, currentIndex } = historyState
    const { path, query } = list[currentIndex]
    history.push({
      path,
      query,
      ...options,
    })
  },
  replace(options: NavigationParameter) {
    const { path, close } = options
    const query = options.query || ''
    const data = options.data || {}
    const title = options.title || ''

    const state = generateState(data, close)

    window.history.replaceState(state, title, history.basePath + path + new QueryString(query))

    const { list, currentIndex } = historyState
    list.splice(currentIndex, 1, {
      state,
      title,
      path,
      query,
    })
    updateStore(historyState, {
      list,
    })
  },
  // 修改 url 意外的状态
  replaceState(options: NavigationParameter) {
    const { list, currentIndex } = historyState
    const { path, query } = list[currentIndex]
    history.replace({
      path,
      query,
      ...options,
    })
  },
}

if (!window.history.state) {
  // first time use app
  const { pathname, search } = window.location
  history.push({ path: pathname, query: search })
} else if (window.history.state.$close) {
  // reload on page with modal window
  history.back()
}

const storage = new Storage<typeof historyState>()
const sessionStorageKey = 'gem@historyStateList'
updateStore(historyState, storage.getSession(sessionStorageKey))

window.addEventListener('unload', () => {
  storage.setSession(sessionStorageKey, historyState)
})

window.addEventListener('popstate', event => {
  // forward or back
  // none replace

  // prev data
  const { list, currentIndex } = historyState

  if (event.state === null) {
    const { state, title, path, query } = list[0]
    window.history.pushState(state, title, history.basePath + path + new QueryString(query))
    return
  }

  const { state } = list[currentIndex]
  const newStateIndex = list.findIndex(historyItem => historyItem.state.$key === event.state.$key)

  if (state.$close) {
    const closeHandle = colseHandleMap.get(state)
    if (closeHandle) {
      // reason: back button close modal
      closeHandle()
    } else {
      // reason: reload modal
    }
  }

  updateStore(historyState, {
    currentIndex: newStateIndex,
  })
})
