// @ts-nocheck
@customElement('my-element')
@(globalThis._hmrRegisterClass ? globalThis._hmrRegisterClass("my-element") : Function.prototype)
export class MyElement extends GemElement {
    static _hmr_public_my_element_create() {}
    static create(...args) {
        return this._hmr_public_my_element_create(...args);
    }
    _hmr_private_my_element_handle() {}
    _private_my_element_handle = (...args)=>{
        return this._hmr_private_my_element_handle(...args);
    };
    _hmr_public_my_element_method() {}
    method(...args) {
        return this._hmr_public_my_element_method(...args);
    }
    _hmr_private_my_element_effect() {}
    @effect()
    _private_my_element_effect = (...args)=>{
        return this._hmr_private_my_element_effect(...args);
    };
    static{
        this._defined_fields_ = [
            [
                "_private_my_element_effect",
                "other",
                false,
                "_hmr_private_my_element_effect"
            ],
            [
                "method",
                "method",
                false,
                "_hmr_public_my_element_method"
            ],
            [
                "_private_my_element_handle",
                "fn",
                false,
                "_hmr_private_my_element_handle"
            ],
            [
                "create",
                "method",
                true,
                "_hmr_public_my_element_create"
            ]
        ];
    }
}
if (import.meta.webpackHot) {
    import.meta.webpackHot.accept();
}
