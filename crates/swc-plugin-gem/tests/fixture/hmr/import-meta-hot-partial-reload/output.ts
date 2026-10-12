import { GemElement } from '@mantou/gem';
@customElement('my-a')
@(globalThis._hmrRegisterClass ? globalThis._hmrRegisterClass("my-a") : Function.prototype)
export class MyA extends GemElement {
    static{
        this._defined_fields_ = [];
    }
}
@customElement('my-b')
export class MyB extends GemElement {
    constructor(arg){
        super(arg);
    }
}
if (import.meta.hot) {
    if (import.meta.hot.data.gemLoaded) location.reload();
    import.meta.hot.data.gemLoaded = true;
}
