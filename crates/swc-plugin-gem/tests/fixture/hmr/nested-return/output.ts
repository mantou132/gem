// @ts-nocheck
@(window._hmrRegisterClass ? _hmrRegisterClass("hash_18214d53321c747c") : Function.prototype)
class GemElement extends HTMLElement {
    _private_hash_18214d53321c747c_renderRoot;
    _private_hash_18214d53321c747c_effectList = [];
    _hmr_public_hash_18214d53321c747c_constructor() {
        this._private_hash_18214d53321c747c_effectList.push({
            callback: ()=>{
                if (cond) {
                    return addListener(this, 'click');
                }
            }
        });
        const { mode } = this._private_hash_18214d53321c747c_metadata;
    }
    constructor(...args){
        super();
        this._hmr_public_hash_18214d53321c747c_constructor.bind(this)(...args);
    }
    _hmr_private_hash_18214d53321c747c_metadata_get() {
        return this.constructor[Symbol.metadata];
    }
    get _private_hash_18214d53321c747c_metadata() {
        return this._hmr_private_hash_18214d53321c747c_metadata_get.bind(this)();
    }
    static{
        this._defined_fields_ = [
            [
                "_private_hash_18214d53321c747c_effectList",
                "other",
                false
            ],
            [
                "_private_hash_18214d53321c747c_renderRoot",
                "other",
                false
            ]
        ];
    }
}
