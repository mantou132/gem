import { GemElement, html, property, attribute, customElement } from '../../';

export type Message = number[];

/**
 * @attr first-name
 * @attr last-name
 * @fires say-hi
 * @slot light
 */
@customElement('app-children')
export class Children extends GemElement {
  @attribute firstName: string;
  @attribute lastName: string;
  @property message: Message;

  clickHandle = () => {
    this.dispatchEvent(new CustomEvent('say-hi'));
  };

  render() {
    return html`
      <p>
        attributes:
        <span>${this.firstName}</span>
        <span>${this.lastName}</span>
      </p>
      <p>properties: ${JSON.stringify(this.message)}</p>
      <slot name="light"></slot>
      <button @click=${this.clickHandle}>say hi</button>
    `;
  }
}
