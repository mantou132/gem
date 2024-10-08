import { createStore } from '@mantou/gem/lib/store';

import type { UseCacheStoreOptions } from '../lib/utils';
import { createCacheStore } from '../lib/utils';

export type PaginationReq = {
  page: number;
  size: number;
};

export type PaginationRes<T> =
  | {
      list: T[];
      // 总项目数
      count: number;
    }
  | {
      list: T[];
      // 总页数
      total: number;
    };

export type PageInit = { ids?: string[]; loading?: boolean };

export type PaginationStore<T> = {
  // 总页数
  total: number;
  // 每页数据，只存 ID
  pagination: Partial<{ [page: number]: PageInit }>;
  // 每项数据
  items: Partial<{ [id: string]: T }>;
  // 正在加载，避免重复请求
  loader: Partial<Record<string, Promise<T>>>;
  // 用来触发 `<dy-pro-table>` fetch 事件
  updatedItem?: T;
  // 不被缓存的便捷方法
  getData: (page?: number) => (T | undefined)[] | undefined;
  isLoading: (page?: number) => boolean;
};

export type PaginationStoreOptions<T> = {
  // 持久化缓存 key, 不提供则不进行持久化缓存
  storageKey?: string;
  // 指定 item 的唯一 key
  idKey?: keyof T;
  // 页面数据是否包含 item，如果包含，则不需要调用额外的 updateItem
  pageContainItem?: boolean;
  // 是否缓存 Item，如果不缓存，store.items 中的内容可能为空
  cacheItems?: boolean;
} & UseCacheStoreOptions<T>;

export function createPaginationStore<T extends Record<string, any>>(options: PaginationStoreOptions<T>) {
  const { idKey = 'id', storageKey, cacheItems, pageContainItem, ...rest } = options;

  const cacheExcludeKeys: (keyof PaginationStore<T>)[] = ['loader', 'updatedItem'];
  if (!cacheItems) cacheExcludeKeys.push('items');

  const initStore: PaginationStore<T> = {
    total: 0,
    pagination: {},
    items: {},
    loader: {},
    getData(page = 1) {
      return store.pagination[page]?.ids?.map((id) => store.items[id]);
    },
    isLoading(page = 1) {
      return !!store.pagination[page]?.loading;
    },
  };
  const { store, saveStore } = storageKey
    ? createCacheStore<PaginationStore<T>>(storageKey, initStore, {
        ...rest,
        cacheExcludeKeys,
      })
    : { store: createStore(initStore), saveStore: () => {} };

  const changePage = (page: number, content: Partial<PageInit>) => {
    store.pagination[page] = { ...store.pagination[page], ...content };
    store();
  };

  // 指定 API 函数和参数来更新 Store
  const updatePage = async <Req extends PaginationReq>(request: (q: Req) => Promise<PaginationRes<any>>, q?: Req) => {
    const req = q || ({ page: 1, size: 10_000 } as Req);
    changePage(req.page, { loading: true });
    try {
      const result = await request(req);
      changePage(req.page, { ids: result.list.map((e) => e[idKey]) });

      if (pageContainItem) {
        result.list.forEach((e) => (store.items[e[idKey]] = e));
      }

      store({ total: 'total' in result ? result.total : Math.ceil(result.count / req.size) });
    } finally {
      changePage(req.page, { loading: false });
    }
  };

  const updateItem = async (request: ((id: string) => Promise<T>) | T, id?: string) => {
    if (typeof request !== 'function') {
      const item = request;
      store.items[item[idKey]] = item;
      store.updatedItem = item;
      store();
      return;
    }
    if (id === undefined) {
      return;
    }
    if (store.loader[id]) return;
    const loader = request(id);
    store.loader[id] = loader;
    store();
    try {
      const item = await loader;
      store.items[item[idKey]] = item;
      store();
    } finally {
      delete store.loader[id];
      store();
    }
  };

  return {
    store,
    saveStore,
    updateItem,
    updatePage,
  };
}
