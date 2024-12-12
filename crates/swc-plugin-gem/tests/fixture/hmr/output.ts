// @ts-nocheck
@customElement('my-element')
class MyElement extends GemElement {
  _hmr_public_my_element_method(arg) {
    console.log('method');
  }
  @effect([])
  method() {
    return this._hmr_public_my_element_method.bind(this)(...arguments);
  }
  _hmr_public_my_element_field(arg) {
    console.log('field');
  }
  @effect([])
  field = () => {
    return this._hmr_public_my_element_field.bind(this)(...arguments);
  };
  _hmr_private_my_element_method(arg) {
    console.log('#method');
  }
  @effect([])
  _private_my_element_method() {
    return this._hmr_private_my_element_method.bind(this)(...arguments);
  }
  _hmr_private_my_element_field(arg) {
    console.log('#field');
  }
  @effect([])
  _private_my_element_field = () => {
    return this._hmr_private_my_element_field.bind(this)(...arguments);
  };
  _private_my_element_content;
}
