import { GemElement, html, property, attribute, emitter, customElement } from '../../';

export type Message = number[];

/**
 * @attr first-name
 * @attr last-name
 * @slot light
 * @fires sayhi
 * @fires load
 */
@customElement('app-children')
export class Children extends GemElement {
  @attribute firstName: string;
  @attribute lastName: string;
  @property message: Message;
  @emitter sayHi: Function;
  @emitter load: Function;

  mounted = () => {
    setTimeout(() => this.load(new Date()), 1000);
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
      <button @click=${this.sayHi}>say hi</button>
    `;
  }
}
