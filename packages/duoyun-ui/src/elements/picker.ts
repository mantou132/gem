import {
  connectStore,
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  state,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import { ContextMenu, MenuItem } from './menu';

import './use';

export const pickerStyle = createCSSSheet(css`
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
  :host(:where([data-active], :state(active))) {
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
  :host(:not([disabled]):where(:hover, [data-active], :state(active))) dy-use {
    color: ${theme.textColor};
  }
`);

export abstract class BasePickerElement {
  showPicker: () => void;
}

const style = createCSSSheet(css`
  :host {
    width: 12em;
  }
  .value {
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .placeholder {
    color: ${theme.describeColor};
  }
`);

export interface Option<T = any> {
  label: string | TemplateResult;
  description?: string | TemplateResult;
  value?: T;
  children?: Option<T>[];
}

/**
 * @customElement dy-picker
 * @attr disabled
 * @attr borderless
 * @attr selectmode
 * @attr fit
 * @attr multiple
 */
@customElement('dy-picker')
@adoptedStyle(style)
@adoptedStyle(pickerStyle)
@adoptedStyle(focusStyle)
@connectStore(icons)
export class DuoyunPickElement extends GemElement implements BasePickerElement {
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

  constructor() {
    super();
    this.addEventListener('click', this.#onOpen);
    this.addEventListener('keydown', commonHandle);
    this.tabIndex = 0;
    this.internals.role = 'combobox';
  }

  #isContain = (value: any) => {
    return this.multiple ? (this.value as any[]).includes(value) : this.value === value;
  };

  #genMenu = ({ label, description, value, children }: Option): MenuItem => {
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

  updated = () => {
    if (this.active) {
      this.#onOpen();
    }
  };

  mounted = () => {
    return () => this.active && ContextMenu.close();
  };

  render = () => {
    const currents = this.options
      ?.map((e) => (e.children ? [e, ...e.children] : e))
      .flat()
      .filter((e) => this.#isContain(e.value ?? e.label));
    const currentLabels = currents?.map((e) => e.label);
    const isEmpty = !currentLabels?.length;
    return html`
      <div class=${classMap({ value: true, placeholder: isEmpty })}>
        ${isEmpty ? this.placeholder : typeof currentLabels[0] === 'object' ? currentLabels : currentLabels.join()}
      </div>
      <dy-use class="icon" .element=${icons.expand}></dy-use>
    `;
  };

  showPicker = () => this.#onOpen();
}
