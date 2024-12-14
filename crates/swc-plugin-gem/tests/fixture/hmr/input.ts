// @ts-nocheck
@customElement('my-element')
class MyElement extends GemElement {
  @emitter change;
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
}
