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
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { classMap, partMap, styleMap } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { theme } from '../lib/theme';
import type { Option } from './radio';

import './use';

const getAnchorName = (index: number) => `--anchor-${index}`;

const style = css`
  /* 等宽分段：撑满时平分宽度，未撑满时按最宽的标签决定宽度 */
  :host(:where(:not([hidden]))) {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    cursor: default;
    font-size: 0.875em;
    line-height: 1.2;
    border-radius: ${theme.normalRound};
    background: ${theme.hoverBackgroundColor};
    --padding: 3px;
    padding: var(--padding);
    gap: var(--padding);
    --inner-radius: max(calc(${theme.normalRound} - var(--padding)), ${theme.smallRound});
    box-sizing: border-box;
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
    display: flex;
    justify-content: center;
    gap: 0.3em;
    padding: calc(0.5em - var(--padding) + 1px) 1em;
    border-radius: var(--inner-radius);
    min-width: 0;
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
      border-radius: var(--inner-radius);
      position: absolute;
      inset: anchor(top) anchor(right) anchor(bottom) anchor(left);
      background: ${theme.backgroundColor};
    }
    :host(:not([disabled])) .marker {
      box-shadow: ${theme.controlShadow};
    }
    /* 只在点击切换时动画，避免首次渲染（锚点定位完成前）也执行动画 */
    :host(:state(animating)) .marker {
      transition: inset 0.3s ${theme.timingFunction};
    }
  }
`;

export interface SegmentedOption<T = any> extends Option<T> {
  icon?: string | Element | DocumentFragment;
}

@customElement('tap-segmented')
@adoptedStyle(style)
@shadow({ delegatesFocus: true })
@aria({ role: 'group' })
export class TapSegmentedElement extends GemElement {
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
      <span
        v-if=${currentIndex !== -1}
        class="marker"
        part=${TapSegmentedElement.marker}
        style=${styleMap({ positionAnchor: getAnchorName(currentIndex) })}
      ></span>
      ${this.options.map(({ value, label, icon }, index) => {
        return html`
          <div
            role="radio"
            tabindex=${-Number(this.disabled)}
            aria-disabled=${this.disabled}
            style=${styleMap({ anchorName: getAnchorName(index) })}
            class=${classMap({ segment: true, current: index === currentIndex })}
            part=${partMap({
              [TapSegmentedElement.segment]: true,
              [TapSegmentedElement.current]: index === currentIndex,
            })}
            @keydown=${commonHandle}
            @click=${() => this.#onClick(value ?? index)}
          >
            <tap-use v-if=${!!icon} part=${TapSegmentedElement.icon} class="icon" .element=${icon}></tap-use>
            <span class="label">${label}</span>
          </div>
        `;
      })}
    `;
  };
}
