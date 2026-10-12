// @ts-nocheck
@customElement('my-element')
@(globalThis._hmrRegisterClass ? globalThis._hmrRegisterClass("my-element") : Function.prototype)
export class MyElement extends GemElement {
    _hmr_public_my_element_constructor(arg) {
        console.log(arg);
    }
    constructor(...args){
        super();
        this._hmr_public_my_element_constructor(...args);
    }
    @emitter
    change;
    _hmr_public_my_element_src_get() {
        return 1;
    }
    get src() {
        return this._hmr_public_my_element_src_get();
    }
    _hmr_public_my_element_src_set(value) {
        this._v = value;
    }
    set src(value) {
        this._hmr_public_my_element_src_set(value);
    }
    _hmr_public_my_element_method(arg) {
        console.log('method');
        if ("_private_my_element_method" in this) {
            console.log('#method in this');
        }
    }
    @effect([])
    method(...args) {
        return this._hmr_public_my_element_method(...args);
    }
    _hmr_public_my_element_field(arg) {
        console.log('field');
    }
    @effect([])
    field = (...args)=>{
        return this._hmr_public_my_element_field(...args);
    };
    _hmr_private_my_element_method(arg) {
        console.log('#method');
    }
    @effect([])
    _private_my_element_method(...args) {
        return this._hmr_private_my_element_method(...args);
    }
    _hmr_private_my_element_field(arg) {
        console.log('#field');
    }
    @effect((i)=>[
            i._private_my_element_field
        ])
    _private_my_element_field = (...args)=>{
        return this._hmr_private_my_element_field(...args);
    };
    _hmr_private_my_element_fieldExpr(arg) {
        return console.log('#fieldExpr');
    }
    @effect([])
    _private_my_element_fieldExpr = (...args)=>{
        return this._hmr_private_my_element_fieldExpr(...args);
    };
    _private_my_element_content;
    @state
    open;
    static{
        this._defined_fields_ = [
            [
                "open",
                "state",
                false
            ],
            [
                "_private_my_element_content",
                "other",
                false
            ],
            [
                "_private_my_element_fieldExpr",
                "other",
                false,
                "_hmr_private_my_element_fieldExpr"
            ],
            [
                "_private_my_element_field",
                "other",
                false,
                "_hmr_private_my_element_field"
            ],
            [
                "_private_my_element_method",
                "other",
                false,
                "_hmr_private_my_element_method"
            ],
            [
                "field",
                "other",
                false,
                "_hmr_public_my_element_field"
            ],
            [
                "method",
                "other",
                false,
                "_hmr_public_my_element_method"
            ],
            [
                "src",
                "method",
                false,
                "_hmr_public_my_element_src_set"
            ],
            [
                "src",
                "method",
                false,
                "_hmr_public_my_element_src_get"
            ],
            [
                "change",
                "emitter",
                false
            ],
            [
                "constructor",
                "ctor",
                false,
                "_hmr_public_my_element_constructor"
            ]
        ];
    }
}
if (import.meta.webpackHot) {
    import.meta.webpackHot.accept();
}
