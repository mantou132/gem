import React, { FunctionComponent, ComponentClass } from 'react';
import ReactDOM from 'react-dom';
import { GemElement, html } from '..';

class UseReact extends GemElement {
  static observedPropertys = ['component', 'prop'];
  component: FunctionComponent<object> | ComponentClass<object, any>;
  prop: object;
  render() {
    return html`
      <style>
        :host {
          display: contents;
        }
      </style>
      <slot></slot>
    `;
  }
  mounted() {
    const shadowRoot = this.shadowRoot as unknown;
    ReactDOM.render(React.createElement(this.component, this.prop), shadowRoot as HTMLElement);
  }
  updated() {
    this.mounted();
  }
}

customElements.define('gem-use-react', UseReact);
