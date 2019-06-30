export declare const STORE_MODULE: unique symbol;
export declare const STORE_MODULE_KEY: unique symbol;
export declare function createStore<T extends object>(originStore: T): T;
declare type StoreModule = object;
export declare function updateStore(storeModule: StoreModule, value: Partial<StoreModule>): void;
export declare function connect(storeModule: StoreModule, func: Function): void;
export declare function disconnect(storeModule: StoreModule, func: Function): void;
export {};
