import {
  GemElement,
  html,
  property,
  attribute,
  slot,
  part,
  state,
  emitter,
  Emitter,
  customElement,
  numattribute,
  boolattribute,
} from '../../';

export type Message = number[];

/**
 * @attr first-name
 * @attr last-name
 * @attr count
 * @attr disabled
 * @fires say-hi
 * @fires load
 * @state odd
 * @slot light
 * @part paragraph
 */
@customElement('app-children')
export class Children extends GemElement {
  @attribute firstName: string;
  @attribute lastName: string;
  @numattribute count: number;
  @boolattribute disabled: boolean;
  @property message: Message | undefined;
  @emitter sayHi: Emitter;
  @emitter load: Emitter;

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
        <span>${this.firstName},</span>
        <span>${this.lastName},</span>
        <span>${this.disabled},</span>
        <span>${this.count}.</span>
      </p>
      <p part=${this.paragraph}>properties: ${JSON.stringify(this.message)}</p>
      <slot name=${this.light}></slot>
      <button @click=${() => this.sayHi({}, { bubbles: true, composed: true })}>say hi</button>
    `;
  }
}
