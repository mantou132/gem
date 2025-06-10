import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  customElement,
  effect,
  emitter,
  numattribute,
  part,
  property,
  shadow,
} from '@mantou/gem/lib/decorators';
import { css, GemElement, html, repeat, type TemplateResult } from '@mantou/gem/lib/element';

import { parseDurationToParts } from '../lib/time';

const style = css`
  :host(:where(:not([hidden]))) {
    display: inline-flex;
    font-variant-numeric: tabular-nums;
  }
  .delimiter::before {
    content: ':';
  }
`;

@customElement('dy-countdown')
@adoptedStyle(style)
@aria({ role: 'timer' })
@shadow()
export class DuoyunCountdownElement extends GemElement {
  @part static hours: string;
  @part static minutes: string;
  @part static seconds: string;
  @part static delimiter: string;

  @numattribute value: number;
  @property renderChar: (char: string) => TemplateResult;

  @emitter finish: Emitter;

  get #value() {
    return this.value || Date.now();
  }

  get #diff() {
    return Math.max(0, this.#value - Date.now());
  }

  get #renderChar() {
    return this.renderChar || ((v: string) => v);
  }

  @effect()
  #update = () => {
    const timer = setTimeout(() => this.update(), this.#diff % 1000);
    return () => clearTimeout(timer);
  };

  #fill = (n: number) => {
    const str = n.toString().padStart(2, '0');
    return repeat([...str], (char) => this.#renderChar(char));
  };

  render = () => {
    const currentSec = Math.round(this.#diff / 1000);
    if (!currentSec) this.finish();

    const { hours, minutes, seconds } = parseDurationToParts(currentSec * 1000);
    return html`
      <div part=${DuoyunCountdownElement.hours}>${this.#fill(hours)}</div>
      <div part=${DuoyunCountdownElement.delimiter} class="delimiter"></div>
      <div part=${DuoyunCountdownElement.minutes}>${this.#fill(minutes)}</div>
      <div part=${DuoyunCountdownElement.delimiter} class="delimiter"></div>
      <div part=${DuoyunCountdownElement.seconds}>${this.#fill(seconds)}</div>
    `;
  };
}
