// @ts-nocheck
import { createStore } from '@mantou/gem';
export const store = (globalThis._hmrKeep || ((_, fn)=>fn()))("6baf50301989d347_store", ()=>createStore({
        a: 1
    }));
const other = 1, store2 = (globalThis._hmrKeep || ((_, fn)=>fn()))("6baf50301989d347_store2", ()=>createStore({
        b: 1
    }));
const local = createLocalStore();
@customElement('my-element')
@connectStore(store)
@(globalThis._hmrRegisterClass ? globalThis._hmrRegisterClass("my-element") : Function.prototype)
export class MyElement extends GemElement {
    static{
        this._defined_fields_ = [];
    }
}
if (import.meta.webpackHot) {
    import.meta.webpackHot.accept();
}
