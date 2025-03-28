// @ts-nocheck
@customElement('my-element')
@(window._hmrRegisterClass ? _hmrRegisterClass("my-element") : Function.prototype)
export class MyElement extends GemElement {
    _hmr_public_my_element_constructor(arg) {
        console.log(arg);
    }
    constructor(...args){
        super();
        this._hmr_public_my_element_constructor.bind(this)(...args);
    }
    @emitter
    change;
    _hmr_public_my_element_src() {
        return 1;
    }
    get src() {
        return this._hmr_public_my_element_src.bind(this)();
    }
    _hmr_public_my_element_method(arg) {
        console.log('method');
    }
    @effect([])
    method(...args) {
        return this._hmr_public_my_element_method.bind(this)(...args);
    }
    _hmr_public_my_element_field(arg) {
        console.log('field');
    }
    @effect([])
    field = (...args)=>{
        return this._hmr_public_my_element_field.bind(this)(...args);
    };
    _hmr_private_my_element_method(arg) {
        console.log('#method');
    }
    @effect([])
    _private_my_element_method(...args) {
        return this._hmr_private_my_element_method.bind(this)(...args);
    }
    _hmr_private_my_element_field(arg) {
        console.log('#field');
    }
    @effect((i)=>[
            i._private_my_element_field
        ])
    _private_my_element_field = (...args)=>{
        return this._hmr_private_my_element_field.bind(this)(...args);
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
                "change",
                "emitter",
                false
            ]
        ];
    }
}
if (import.meta.webpackHot) {
    import.meta.webpackHot.accept();
}
