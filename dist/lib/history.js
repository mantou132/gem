import { createStore, updateStore } from './store.js';
import { Storage } from './utils';
const storage = new Storage();
export class QueryString extends URLSearchParams {
    constructor(param) {
        if (param instanceof QueryString) {
            return param;
        }
        if (typeof param === 'string') {
            super(param);
        }
        else {
            super();
            Object.keys(param).forEach(key => {
                this.append(key, param[key]);
            });
        }
    }
    concat(param) {
        let query;
        if (typeof param === 'string') {
            query = new URLSearchParams(param);
        }
        else {
            query = param;
        }
        Object.keys(query).forEach(key => {
            this.append(key, query[key]);
        });
    }
    toString() {
        const string = super.toString();
        return string ? `?${string}` : '';
    }
    toJSON() {
        return this.toString();
    }
}
const colseHandleMap = new WeakMap();
function generateState(data, close) {
    if (data.$key)
        throw new Error('`$key` is not allowed');
    if (data.$close)
        throw new Error('`$close` is not allowed');
    const state = Object.assign({}, data, { $key: Date.now() + performance.now(), $close: !!close });
    colseHandleMap.set(state, close);
    return state;
}
const store = createStore({
    historyState: {
        list: [],
        currentIndex: -1,
    },
});
export const history = {
    historyState: store.historyState,
    basePath: '',
    get location() {
        const { list, currentIndex } = store.historyState;
        const location = list[currentIndex];
        const query = new QueryString(location.query);
        return {
            path: location.path,
            query,
            state: location.state,
            title: location.title,
            href: location.path + query,
        };
    },
    forward() {
        window.history.forward();
    },
    back() {
        window.history.back();
    },
    push(options) {
        const { path, close } = options;
        const query = options.query || '';
        const title = options.title || '';
        const data = options.data || {};
        const state = generateState(data, close);
        window.history.pushState(state, title, history.basePath + path + new QueryString(query));
        const { list, currentIndex } = store.historyState;
        const newList = list.slice(0, currentIndex + 1).concat({
            state,
            title,
            path,
            query,
        });
        updateStore(store.historyState, {
            list: newList,
            currentIndex: newList.length - 1,
        });
    },
    pushState(options) {
        const { path, query } = history.location;
        history.push(Object.assign({ path,
            query }, options));
    },
    replace(options) {
        const { path, close } = options;
        const query = options.query || '';
        const data = options.data || {};
        const title = options.title || '';
        const state = generateState(data, close);
        window.history.replaceState(state, title, history.basePath + path + new QueryString(query));
        const { list, currentIndex } = store.historyState;
        list.splice(currentIndex, 1, {
            state,
            title,
            path,
            query,
        });
        updateStore(store.historyState, {
            list,
        });
    },
    replaceState(options) {
        const { path, query } = history.location;
        history.replace(Object.assign({ path,
            query }, options));
    },
};
if (!window.history.state) {
    // first time use app
    const { pathname, search } = window.location;
    history.push({ path: pathname, query: search });
}
else if (window.history.state.$close) {
    // reload on page with modal window
    history.back();
}
const sessionStorageKey = 'gem@historyStateList';
updateStore(store.historyState, storage.getSession(sessionStorageKey));
window.addEventListener('unload', () => {
    storage.setSession(sessionStorageKey, store.historyState);
});
window.addEventListener('popstate', event => {
    // forward or back
    // none replace
    // prev data
    const { list, currentIndex } = store.historyState;
    if (event.state === null) {
        const { state, title, path, query } = list[0];
        window.history.pushState(state, title, history.basePath + path + new QueryString(query));
        return;
    }
    const { state } = list[currentIndex];
    const newStateIndex = list.findIndex(historyItem => historyItem.state.$key === event.state.$key);
    if (state.$close) {
        const closeHandle = colseHandleMap.get(state);
        if (closeHandle) {
            // reason: back button close modal
            closeHandle();
        }
        else {
            // reason: reload modal
        }
    }
    updateStore(store.historyState, {
        currentIndex: newStateIndex,
    });
});
//# sourceMappingURL=history.js.map