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
  shadow,
  mounted,
} from '@mantou/gem';

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
@shadow()
export class Children extends GemElement {
  @slot static light: string;
  @part static paragraph: string;

  @attribute firstName: string;
  @attribute lastName: string;
  @numattribute count: number;
  @boolattribute disabled: boolean;
  @property message: Message | undefined;
  @emitter sayHi: Emitter;
  @emitter load: Emitter;
  @state odd: boolean;

  constructor() {
    super();
    console.log('child cons');
  }

  @mounted()
  #init = () => {
    console.log('child mounted');
    setTimeout(() => this.load(new Date()), 1000);
    this.addEventListener('click', () => {
      this.odd = !this.odd;
    });
  };

  render() {
    console.log('child render');
    return html`
      <p>
        attributes:
        <span>${this.firstName},</span>
        <span>${this.lastName},</span>
        <span>${this.disabled},</span>
        <span>${this.count}.</span>
      </p>
      <p part=${Children.paragraph}>properties: ${JSON.stringify(this.message)}</p>
      <slot name=${Children.light}></slot>
      <button @click=${() => this.sayHi({}, { bubbles: true, composed: true })}>say hi</button>
    `;
  }
}
