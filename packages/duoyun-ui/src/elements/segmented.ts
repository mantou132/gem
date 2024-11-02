import { css, GemElement, html } from '@mantou/gem/lib/element';
import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  boolattribute,
  customElement,
  emitter,
  part,
  property,
  shadow,
  state,
} from '@mantou/gem/lib/decorators';
import { classMap, partMap, styleMap } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { theme } from '../lib/theme';

import type { Option } from './radio';

import './use';

const getAnchorName = (index: number) => `--anchor-${index}`;

const style = css`
  :host(:where(:not([hidden]))) {
    display: flex;
    cursor: default;
    user-select: none;
    font-size: 0.875em;
    line-height: 1.2;
    border-radius: ${theme.normalRound};
    background: ${theme.hoverBackgroundColor};
    --padding: 3px;
    padding: var(--padding);
    gap: var(--padding);
    --inner-radius: max(calc(${theme.normalRound} - var(--padding)), ${theme.smallRound});
  }
  :host([small]) {
    font-size: 0.75em;
  }
  :host([disabled]) {
    cursor: not-allowed;
  }
  :host([disabled]) .segment * {
    opacity: 0.5;
  }
  .segment {
    z-index: 0;
    width: 0;
    flex-grow: 1;
    display: flex;
    justify-content: center;
    gap: 0.3em;
    padding: calc(0.5em - var(--padding) + 1px) 1em;
    border-radius: var(--inner-radius);
    min-width: 5em;
  }
  :host(:where(:not([disabled], :state(animating)))) .segment:hover {
    background: color-mix(in srgb, ${theme.hoverBackgroundColor}, currentColor 6%);
    &:active {
      background: color-mix(in srgb, ${theme.hoverBackgroundColor}, currentColor 10%);
    }
  }
  :host .segment.current {
    background: ${theme.backgroundColor};
  }
  :host(:not([disabled])) .segment.current {
    box-shadow: ${theme.controlShadow};
  }
  .icon {
    flex-shrink: 0;
    width: 1.2em;
  }
  .label {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .marker {
    display: none;
  }
  @supports (anchor-name: --foo) {
    :host .segment.current {
      background: none;
      box-shadow: none;
    }
    :host(:not([disabled])) .segment.current {
      box-shadow: none;
    }
    .marker {
      display: block;
      transition: inset 0.3s ${theme.timingFunction};
      border-radius: var(--inner-radius);
      position: absolute;
      inset: anchor(top) anchor(right) anchor(bottom) anchor(left);
      background: ${theme.backgroundColor};
    }
    :host(:not([disabled])) .marker {
      box-shadow: ${theme.controlShadow};
    }
  }
`;

export interface SegmentedOption<T = any> extends Option<T> {
  icon?: string | Element | DocumentFragment;
}

@customElement('dy-segmented')
@adoptedStyle(style)
@shadow({ delegatesFocus: true })
@aria({ role: 'group' })
export class DuoyunSegmentedElement extends GemElement {
  @part static segment: string;
  @part static icon: string;
  @part static marker: string;
  @part static current: string;

  @boolattribute disabled: boolean;
  @boolattribute small: boolean;

  @state animating: boolean;

  @property options?: SegmentedOption[];
  @property value?: any;
  @emitter change: Emitter<any>;

  #onClick = (v: any) => {
    if (this.disabled) return;
    this.animating = true;
    setTimeout(() => (this.animating = false), 300);
    this.change(v);
  };

  render = () => {
    if (!this.options) return html``;
    const currentIndex = this.options.findIndex(({ value }, index) => (value ?? index) === this.value);
    return html`
      ${currentIndex !== -1
        ? html`
            <span
              class="marker"
              part=${DuoyunSegmentedElement.marker}
              style=${styleMap({ positionAnchor: getAnchorName(currentIndex) })}
            ></span>
          `
        : ''}
      ${this.options.map(({ value, label, icon }, index) => {
        return html`
          <div
            role="radio"
            tabindex=${-Number(this.disabled)}
            aria-disabled=${this.disabled}
            style=${styleMap({ anchorName: getAnchorName(index) })}
            class=${classMap({ segment: true, current: index === currentIndex })}
            part=${partMap({
              [DuoyunSegmentedElement.segment]: true,
              [DuoyunSegmentedElement.current]: index === currentIndex,
            })}
            @keydown=${commonHandle}
            @click=${() => this.#onClick(value ?? index)}
          >
            ${icon ? html`<dy-use part=${DuoyunSegmentedElement.icon} class="icon" .element=${icon}></dy-use>` : ''}
            <span class="label">${label}</span>
          </div>
        `;
      })}
    `;
  };
}
