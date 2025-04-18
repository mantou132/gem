import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  connectStore,
  customElement,
  effect,
  globalemitter,
  mounted,
  property,
  shadow,
  state,
} from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';
import type { ContextMenuItem } from './contextmenu';
import { ContextMenu } from './contextmenu';

import './use';
import './scroll-box';

export const pickerStyle = css`
  :host(:where(:not([hidden]))) {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    line-height: 2;
    padding: 0.1em 0.5em;
    gap: 0.5em;
    font-size: 0.875em;
    box-sizing: border-box;
  }
  :host(:not([borderless], [disabled])) {
    box-shadow: ${theme.controlShadow};
  }
  :host(:state(active)) {
    background: ${theme.lightBackgroundColor};
  }
  :host([disabled]) {
    cursor: not-allowed;
    border-color: transparent;
    background: ${theme.disabledColor};
  }
  :host([disabled]) dy-use {
    pointer-events: none;
  }
  :host([borderless]) {
    width: auto;
    border-color: transparent;
  }
  dy-use {
    flex-shrink: 0;
    padding-block: 0.4em;
    width: 1.2em;
    color: ${theme.borderColor};
  }
  :host(:not([disabled], [borderless]):where(:hover, :state(active))) {
    border-color: ${theme.primaryColor};
  }
  :host(:not([disabled]):where(:hover, :state(active))) dy-use {
    color: ${theme.textColor};
  }
`;

export abstract class BasePickerElement {
  disabled: boolean;
  showPicker: () => void;
}

const style = css`
  :host {
    width: 12em;
    white-space: nowrap;
  }
  .placeholder,
  .value,
  .values {
    flex-grow: 1;
  }
  .placeholder,
  .value {
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .placeholder {
    color: ${theme.describeColor};
  }
`;

export interface Option<T = any> {
  label: string | TemplateResult;
  description?: string | TemplateResult;
  value?: T;
  children?: Option<T>[];
}

@customElement('dy-picker')
@adoptedStyle(style)
@adoptedStyle(pickerStyle)
@adoptedStyle(focusStyle)
@connectStore(icons)
@shadow()
@aria({ focusable: true, role: 'combobox' })
export class DuoyunPickerElement extends GemElement implements BasePickerElement {
  @attribute placeholder: string;
  @boolattribute disabled: boolean;
  @boolattribute borderless: boolean;
  @boolattribute selectmode: boolean;
  @boolattribute fit: boolean;
  @boolattribute multiple: boolean;

  @state active: boolean;
  @property options?: Option[];
  @property value?: any | any[];
  @globalemitter change: Emitter<any>;

  #isContain = (value: any) => {
    return this.multiple ? this.value?.includes(value) : this.value === value;
  };

  #genMenu = ({ label, description, value, children }: Option): ContextMenuItem => {
    const v = value ?? label;
    return {
      text: label,
      description,
      selected: !this.selectmode && !children && this.#isContain(v),
      handle: children
        ? undefined
        : () => {
            if (this.multiple) {
              const set = new Set(this.value);
              set.has(v) ? set.delete(v) : set.add(v);
              this.change([...set]);
            } else if (!this.#isContain(v)) {
              this.change(v);
            }
          },
      menu: children?.map(this.#genMenu),
    };
  };

  #onOpen = async () => {
    if (this.disabled || !this.options || !this.options.length) return;
    await ContextMenu.open(this.options.map(this.#genMenu), {
      activeElement: this,
      width: this.fit ? `${this.getBoundingClientRect().width}px` : undefined,
    });
  };

  @mounted()
  #init = () => {
    addListener(this, 'click', this.#onOpen);
    addListener(this, 'keydown', commonHandle);
    return () => this.active && ContextMenu.close();
  };

  @effect()
  #autoOpen = () => {
    if (!this.active) return;
    this.#onOpen();
  };

  render = () => {
    const currents = this.options
      ?.flatMap((e) => (e.children ? [e, ...e.children] : e))
      .filter((e) => this.#isContain(e.value ?? e.label));
    const currentLabels = currents?.map((e) => e.label);
    const isEmpty = !currentLabels?.length;
    return html`
      <div v-if=${isEmpty} class="placeholder">${this.placeholder}</div>
      <div v-else-if=${!this.multiple} class="value">${currentLabels}</div>
      <dy-scroll-box v-else class="values">
        ${typeof currentLabels?.at(0) === 'object' ? currentLabels : currentLabels?.join(', ')}
      </dy-scroll-box>
      <dy-use .element=${icons.expand}></dy-use>
    `;
  };

  showPicker() {
    this.#onOpen();
  }
}
