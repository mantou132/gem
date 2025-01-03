// @ts-nocheck
@customElement('my-element')
class MyElement extends GemElement {
  constructor(arg) {
    super();
    console.log(arg);
  }
  @emitter change;
  get src() {
    return 1;
  }
  @effect([])
  method(arg) {
    console.log('method');
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
  #content;
  @state open;
}
