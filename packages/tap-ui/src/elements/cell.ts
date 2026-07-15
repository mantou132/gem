import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  customElement,
  effect,
  emitter,
  part,
  property,
  shadow,
  slot,
  template,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { css, GemElement, html } from '@mantou/gem/lib/element';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';

import './switch';
import './use';

const cellStyle = css`
  :host(:where(:not([hidden]))) {
    display: flex;
    align-items: center;
    gap: 0.75em;
    min-height: 3.5em;
    padding: 0.75em 1em;
    box-sizing: border-box;
    position: relative;
    background: ${theme.backgroundColor};
    color: ${theme.highlightColor};
    font-size: 1.0625em;
    line-height: 1.4;
    -webkit-tap-highlight-color: transparent;
  }
  :host([action]) {
    cursor: pointer;
  }
  :host([action]:active) {
    background: ${theme.hoverBackgroundColor};
  }
  :host(:not(:last-of-type))::after {
    content: '';
    position: absolute;
    inset-inline-start: 1em;
    inset-inline-end: 0;
    inset-block-end: 0;
    border-block-end: 1px solid ${theme.borderColor};
    pointer-events: none;
  }
  .label {
    flex: 1;
    min-width: 0;
  }
  .rest {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5em;
    max-width: 65%;
    min-width: 0;
    color: ${theme.describeColor};
    font-size: 0.94em;
  }
  .description,
  ::slotted([slot='description']) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .extra {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    max-width: 100%;
  }
  .action {
    flex-shrink: 0;
    width: 1.25em;
    color: ${theme.describeColor};
    opacity: 0.55;
  }
`;

@customElement('tap-cell')
@adoptedStyle(cellStyle)
@aria({ role: 'group' })
@shadow()
export class TapCellElement extends GemElement {
  @slot @part static label: string;
  @slot static description: string;
  @slot static extra: string;

  @part static action: string;

  /**Primary text on the left */
  @attribute label: string;
  /**Secondary text on the right */
  @attribute description: string;
  /**Show a trailing chevron for navigation rows */
  @boolattribute action: boolean;

  @effect((i) => [i.action])
  #updateAria = () => {
    this.internals.role = this.action ? 'button' : 'group';
  };

  @template()
  #content = () => {
    return html`
      <div class="label" part=${TapCellElement.label}>
        <slot name=${TapCellElement.label}>${this.label}</slot>
      </div>
      <div class="rest">
        <slot name=${TapCellElement.description}>
          <span class="description" v-if=${!!this.description}>${this.description}</span>
        </slot>
        <div class="extra">
          <slot name=${TapCellElement.extra}></slot>
        </div>
        <tap-use v-if=${this.action} class="action" part=${TapCellElement.action} .element=${icons.right}></tap-use>
      </div>
    `;
  };
}

export type CellItem = {
  label: string;
  description?: string | TemplateResult;
  /**Show trailing chevron; defaults to true when not a switch row */
  action?: boolean;
  /**When present, render a switch using this checked state */
  checked?: boolean;
  extra?: string | Element | DocumentFragment | TemplateResult;
};

const groupStyle = css`
  :scope:where(:not([hidden])) {
    display: block;
    width: 100%;
    color: ${theme.textColor};
  }
  :scope:not(:first-of-type) {
    margin-block-start: 0.5em;
  }
  .heading {
    padding: 0.75em 1em 0.5em;
    font-size: 0.8125em;
    line-height: 1.3;
    color: ${theme.describeColor};
  }
  .body {
    display: block;
    background: ${theme.backgroundColor};
  }
`;

@customElement('tap-cell-group')
@adoptedStyle(groupStyle)
@aria({ role: 'group' })
export class TapCellGroupElement extends GemElement {
  /**Optional group header, e.g. "Account" / "General" */
  @attribute heading: string;
  @property items?: CellItem[];

  @emitter itemclick: Emitter<CellItem>;
  @emitter change: Emitter<{ item: CellItem; checked: boolean }>;

  #isSwitch = (item: CellItem) => typeof item.checked === 'boolean';

  #showAction = (item: CellItem) => item.action ?? !this.#isSwitch(item);

  #onSwitchChange = (item: CellItem, evt: CustomEvent<boolean>) => {
    evt.stopPropagation();
    this.change({ item, checked: evt.detail });
  };

  #renderExtra = (item: CellItem) => {
    if (this.#isSwitch(item)) {
      return html`
        <tap-switch
          slot="extra"
          .checked=${item.checked!}
          neutral="positive"
          @change=${(evt: CustomEvent<boolean>) => this.#onSwitchChange(item, evt)}
          @click=${(evt: Event) => evt.stopPropagation()}
        ></tap-switch>
      `;
    }
    if (!item.extra) return '';
    return html`<div slot="extra">${item.extra}</div>`;
  };

  #renderItem = (item: CellItem) => {
    const action = this.#showAction(item);
    const description = typeof item.description === 'string' ? item.description : '';
    return html`
      <tap-cell
        label=${item.label}
        description=${description}
        ?action=${action}
        @click=${() => action && this.itemclick(item)}
      >
        <div v-if=${typeof item.description !== 'string' && !!item.description} slot="description">${item.description}</div>
        ${this.#renderExtra(item)}
      </tap-cell>
    `;
  };

  @effect((i) => [i.heading])
  #updateAria = () => {
    this.internals.ariaLabel = this.heading || null;
  };

  @template()
  #content = () => {
    return html`
      <div class="heading" v-if=${!!this.heading}>${this.heading}</div>
      <div class="body">${(this.items || []).map((item) => this.#renderItem(item))}</div>
    `;
  };
}
