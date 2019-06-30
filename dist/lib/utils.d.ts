export declare class Pool<T> {
    currentId: number;
    count: number;
    pool: Map<number, T>;
    add(item: T): void;
    get(): T;
}
export declare function mergeObject(obj1: object, obj2: object, newObject?: object): object;
declare enum StorageType {
    LOCALSTORAGE = "localStorage",
    SESSIONSTORAGE = "sessionStorage"
}
export declare class Storage<T> {
    cache: {};
    get(key: string, type: StorageType): T;
    getLocal(key: string): T;
    getSession(key: string): T;
    set(key: string, value: T, type: StorageType): void;
    setLocal(key: string, value: T): void;
    setSession(key: string, value: T): void;
}
export {};
