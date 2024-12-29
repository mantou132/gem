// @ts-nocheck
@customElement('my-element')
@(window._hmrRegisterClass ? _hmrRegisterClass("my-element") : Function.prototype)
class MyElement extends GemElement {
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
