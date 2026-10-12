import { GemElement } from '@mantou/gem';
@customElement('my-element')
@(globalThis._hmrRegisterClass ? globalThis._hmrRegisterClass("my-element") : Function.prototype)
export class MyElement extends GemElement {
    ['on-click'] = ()=>1;
    static{
        this._defined_fields_ = [];
    }
}
if (import.meta.webpackHot) {
    import.meta.webpackHot.accept();
}
