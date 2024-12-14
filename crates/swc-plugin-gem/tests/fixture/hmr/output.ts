// @ts-nocheck
@customElement('my-element')
class MyElement extends GemElement {
  @emitter change;
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
  field = (...args) => {
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
  @effect((i) => [i._private_my_element_field])
  _private_my_element_field = (...args) => {
    return this._hmr_private_my_element_field.bind(this)(...args);
  };
  _private_my_element_content;
}
