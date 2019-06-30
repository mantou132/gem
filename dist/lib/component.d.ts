export { html, render } from 'lit-html';
export { repeat } from 'lit-html/directives/repeat';
declare type State = object;
declare type StoreModule = object;
declare const isMountedSymbol: unique symbol;
declare class BaseComponent extends HTMLElement {
    static observedAttributes?: string[];
    static observedPropertys?: string[];
    static observedStores?: StoreModule[];
    state: State;
    [isMountedSymbol]: boolean;
    constructor();
    /**
     * @readonly do't modify
     */
    setState(payload: Partial<State>): void;
    willMount(): void;
    render(): import("lit-html").TemplateResult;
    mounted(): void;
    shouldUpdate(): boolean;
    /**
     * @readonly do't modify
     */
    update(): void;
    updated(): void;
    /**
     * @readonly do't modify
     */
    disconnectStores(storeModuleList: StoreModule[]): void;
    attributeChanged(_name: string, _oldValue: string, _newValue: string): void;
    unmounted(): void;
    private attributeChangedCallback;
    private disconnectedCallback;
}
export declare class Component extends BaseComponent {
    private connectedCallback;
}
export declare class SingleInstanceComponent extends BaseComponent {
    static instance: SingleInstanceComponent;
    constructor();
}
export declare class AsyncComponent extends BaseComponent {
    /**
     * @readonly do't modify
     */
    update(): void;
    private connectedCallback;
}
