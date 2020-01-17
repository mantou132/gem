import { GemElement, html, property, attribute, slot, part, state, emitter, customElement } from '../../';

export type Message = number[];

/**
 * @attr first-name
 * @attr last-name
 * @fires sayhi
 * @fires load
 * @state odd
 * @slot light
 * @part paragraph
 */
@customElement('app-children')
export class Children extends GemElement {
  @attribute firstName: string;
  @attribute lastName: string;
  @property message: Message;
  @emitter sayHi: Function;
  @emitter load: Function;

  @state odd: boolean;
  @slot light: string;
  @part paragraph: string;

  mounted = () => {
    setTimeout(() => this.load(new Date()), 1000);
    this.addEventListener('click', () => {
      this.odd = !this.odd;
    });
  };

  render() {
    return html`
      <p>
        attributes:
        <span>${this.firstName}</span>
        <span>${this.lastName}</span>
      </p>
      <p part=${this.paragraph}>properties: ${JSON.stringify(this.message)}</p>
      <slot name=${this.slot}></slot>
      <button @click=${this.sayHi}>say hi</button>
    `;
  }
}
