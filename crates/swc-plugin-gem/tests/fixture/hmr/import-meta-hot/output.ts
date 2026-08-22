// @ts-nocheck
@customElement('my-element')
@(window._hmrRegisterClass ? _hmrRegisterClass("my-element") : Function.prototype)
export class MyElement extends GemElement {
    _hmr_public_my_element_render() {
        return html`<div></div>`;
    }
    @template()
    render(...args) {
        return this._hmr_public_my_element_render.bind(this)(...args);
    }
    static{
        this._defined_fields_ = [];
    }
}
if (import.meta.hot) {
    import.meta.hot.accept();
}
