import { GemElement } from '@mantou/gem';
@customElement('my-element')
@(globalThis._hmrRegisterClass ? globalThis._hmrRegisterClass("my-element") : Function.prototype)
export class MyElement extends GemElement {
    *_hmr_public_my_element_items() {
        yield 1;
    }
    items(...args) {
        return this._hmr_public_my_element_items(...args);
    }
    async *_hmr_public_my_element_stream() {
        yield 2;
    }
    stream(...args) {
        return this._hmr_public_my_element_stream(...args);
    }
    static{
        this._defined_fields_ = [
            [
                "stream",
                "method",
                false,
                "_hmr_public_my_element_stream"
            ],
            [
                "items",
                "method",
                false,
                "_hmr_public_my_element_items"
            ]
        ];
    }
}
if (import.meta.webpackHot) {
    import.meta.webpackHot.accept();
}
