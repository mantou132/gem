// @ts-nocheck
@customElement('my-element')
export class MyElement extends GemElement {
  constructor(arg) {
    super();
    console.log(arg);
  }
  @emitter change;
  get src() {
    return 1;
  }
  set src(value) {
    this._v = value;
  }
  @effect([])
  method(arg) {
    console.log('method');
    if (#method in this) {
      console.log('#method in this');
    }
  }
  @effect([])
  field = (arg) => {
    console.log('field');
  };
  @effect([])
  #method(arg) {
    console.log('#method');
  }
  @effect((i) => [i.#field])
  #field = (arg) => {
    console.log('#field');
  };
  @effect([])
  #fieldExpr = (arg) => console.log('#fieldExpr');
  #content;
  @state open;
}
