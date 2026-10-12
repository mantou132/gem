// @ts-nocheck
@customElement('my-element')
export class MyElement extends GemElement {
    constructor(arg){
        super(arg);
    }
}
if (import.meta.hot) {
    if (import.meta.hot.data.gemLoaded) location.reload();
    import.meta.hot.data.gemLoaded = true;
}
