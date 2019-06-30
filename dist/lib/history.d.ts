export declare class QueryString extends URLSearchParams {
    constructor(param: any);
    concat(param: any): void;
    toString(): string;
    toJSON(): string;
}
interface HistoryItemState {
    $close: boolean;
    $key: number;
    [index: string]: any;
}
interface HistoryItem {
    path: string;
    query: string | QueryString;
    title: string;
    state: HistoryItemState;
}
interface NavigationParameter {
    path?: string;
    query?: string | QueryString;
    title?: string;
    close?: Function;
    data?: any;
}
export declare const history: {
    historyState: {
        list: HistoryItem[];
        currentIndex: number;
    };
    basePath: string;
    readonly location: {
        path: string;
        query: QueryString;
        state: HistoryItemState;
        title: string;
        href: string;
    };
    forward(): void;
    back(): void;
    push(options: NavigationParameter): void;
    pushState(options: NavigationParameter): void;
    replace(options: NavigationParameter): void;
    replaceState(options: NavigationParameter): void;
};
export {};
