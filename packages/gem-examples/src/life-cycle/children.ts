import type { Emitter } from '@mantou/gem';
import {
  attribute,
  boolattribute,
  customElement,
  emitter,
  GemElement,
  html,
  mounted,
  numattribute,
  part,
  property,
  shadow,
  slot,
  state,
} from '@mantou/gem';

export type Message = number[];

@customElement('app-descendant')
@shadow()
export class Descendant extends GemElement {
  key = 0;

  constructor() {
    super();
    console.log(`descendant${this.key} cons`);
  }

  @mounted()
  #init = () => {
    console.log(`descendant${this.key} mounted`);
  };

  render() {
    console.log(`descendant${this.key} render`);
    if (Math.random() > 0.8) throw new Error('Error, should render fallback content');
    return html``;
  }
}

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
      <app-descendant .key=${1}></app-descendant>
      <app-descendant .key=${2}></app-descendant>
    `;
  }
}
