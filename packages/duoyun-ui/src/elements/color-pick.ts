// https://spectrum.adobe.com/page/color-area/
import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  boolattribute,
  refobject,
  RefObject,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';

import { HexColor } from '../lib/color';
import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import type { BasePickerElement } from './pick';
import type { DuoyunPopoverElement } from './popover';

import './popover';
import './color-panel';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    cursor: pointer;
    display: inline-flex;
    font-size: 0.875em;
    width: 4em;
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
  .picker {
    width: 100%;
    height: calc(2.2em + 2px);
    border-radius: ${theme.normalRound};
    box-shadow: inset 0 0 0 1px #0002;
  }
`);

/**
 * @customElement dy-color-pick
 */
@customElement('dy-color-pick')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunColorPickElement extends GemElement implements BasePickerElement {
  @attribute value: HexColor;
  @boolattribute alpha: boolean;
  @refobject popoverRef: RefObject<DuoyunPopoverElement>;

  @globalemitter change: Emitter<HexColor>;

  constructor() {
    super({ delegatesFocus: true });
  }

  render = () => {
    return html`
      <dy-popover
        trigger="click"
        ref=${this.popoverRef.ref}
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
          role="combobox"
          tabindex="0"
          @keydown=${commonHandle}
          class="picker"
          style=${styleMap({ backgroundColor: this.value })}
        ></div>
      </dy-popover>
    `;
  };

  showPicker = () => {
    this.popoverRef.element?.click();
  };
}
