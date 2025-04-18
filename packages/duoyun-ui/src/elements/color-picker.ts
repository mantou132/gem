// https://spectrum.adobe.com/page/color-area/
import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  customElement,
  globalemitter,
  shadow,
} from '@mantou/gem/lib/decorators';
import { createRef, css, GemElement, html } from '@mantou/gem/lib/element';
import { styleMap } from '@mantou/gem/lib/utils';

import type { HexColor } from '../lib/color';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';
import type { BasePickerElement } from './picker';

import './popover';
import './color-panel';

const style = css`
  :host(:where(:not([hidden]))) {
    cursor: pointer;
    display: inline-flex;
    font-size: 0.875em;
    width: 4em;
    height: calc(2.2em + 2px);
    overflow: hidden;
    border-radius: ${theme.normalRound};
    background: conic-gradient(
        transparent 0.25turn,
        #d3cfcf 0.25turn 0.5turn,
        transparent 0.5turn 0.75turn,
        #d3cfcf 0.75turn
      )
      top left / 1.2em 1.2em repeat;
  }
  :host(:not([disabled])) {
    box-shadow: ${theme.controlShadow};
  }
  :host([disabled]) {
    cursor: not-allowed;
  }
  dy-popover,
  dy-popover::part(slot),
  .picker {
    border-radius: inherit;
  }
  .picker {
    width: 100%;
    height: 100%;
    box-shadow: inset 0 0 0 1px #0002;
  }
`;

@customElement('dy-color-picker')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@shadow({ delegatesFocus: true })
export class DuoyunColorPickerElement extends GemElement implements BasePickerElement {
  @attribute value: HexColor;
  @boolattribute alpha: boolean;
  @boolattribute disabled: boolean;

  @globalemitter change: Emitter<HexColor>;

  #divRef = createRef<HTMLDivElement>();

  render = () => {
    return html`
      <dy-popover
        trigger="click"
        .disabled=${this.disabled}
        .content=${html`
          <dy-color-panel
            style=${styleMap({ marginBlock: '.6em' })}
            value=${this.value}
            ?alpha=${this.alpha}
            @change=${({ detail }: CustomEvent<HexColor>) => this.change(detail)}
          ></dy-color-panel>
        `}
      >
        <div
          ${this.#divRef}
          role="combobox"
          tabindex=${-Number(this.disabled)}
          aria-disabled=${this.disabled}
          @keydown=${commonHandle}
          class="picker"
          style=${styleMap({ backgroundColor: this.value })}
        ></div>
      </dy-popover>
    `;
  };

  showPicker() {
    this.#divRef.value?.click();
  }
}
