import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  property,
  boolattribute,
  state,
  emitter,
  aria,
  shadow,
  mounted,
  memo,
} from '@mantou/gem/lib/decorators';
import { createCSSSheet, GemElement, html } from '@mantou/gem/lib/element';
import { addListener } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { getCascaderDeep } from '../lib/utils';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import { ContextMenu } from './contextmenu';
import type { BasePickerElement } from './picker';
import { pickerStyle } from './picker';
import type { Option, DuoyunCascaderElement, OptionValue } from './cascader';

export type { Option } from './cascader';

import './use';
import './cascader';
import './tag';
import './scroll-box';

const style = createCSSSheet`
  :host {
    width: 15em;
    white-space: nowrap;
  }
  .placeholder,
  .value {
    flex-grow: 1;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .placeholder {
    color: ${theme.describeColor};
  }
  .values {
    flex-grow: 1;
    display: flex;
    gap: 0.5em;
    margin-inline-start: -0.2em;
  }
  dy-tag {
    border-radius: ${theme.smallRound};
  }
`;

@customElement('dy-cascader-picker')
@adoptedStyle(style)
@adoptedStyle(pickerStyle)
@adoptedStyle(focusStyle)
@shadow()
@aria({ focusable: true, role: 'combobox' })
export class DuoyunCascaderPickerElement extends GemElement implements BasePickerElement {
  @attribute placeholder: string;
  @boolattribute fit: boolean;
  @boolattribute disabled: boolean;
  @boolattribute multiple: boolean;
  @state active: boolean;

  @property options?: Option[];
  @property value?: OptionValue[][] | OptionValue[];

  @globalemitter change: Emitter<OptionValue[][] | OptionValue[]>;
  @emitter expand: Emitter<Option>;

  #cascader?: DuoyunCascaderElement;

  @memo((i) => [i.value, i.options])
  #updateCascader = () => {
    if (!this.#cascader) return;
    this.#cascader.value = this.value;
    this.#cascader.options = this.options;
  };

  #onChange = ({ detail, target }: CustomEvent) => {
    this.#cascader = target as DuoyunCascaderElement;
    this.change(detail);
    if (!this.multiple) {
      ContextMenu.close();
    }
  };

  #onExpand = ({ detail, target }: CustomEvent) => {
    this.#cascader = target as DuoyunCascaderElement;
    this.expand(detail);
  };

  #onOpen = () => {
    if (this.disabled || !this.options?.length) return;
    ContextMenu.open(
      html`
        <dy-cascader
          style="margin: -0.4em -1em; min-height: 10em; max-height: calc(50vh - 3em);"
          .options=${this.options}
          .value=${this.value}
          @change=${this.#onChange}
          @expand=${this.#onExpand}
          ?multiple=${this.multiple}
        >
          ${this.fit
            ? html`
                <style>
                  dy-cascader::part(column) {
                    width: ${this.getBoundingClientRect().width / getCascaderDeep(this.options, 'children')}px;
                  }
                </style>
              `
            : ''}
        </dy-cascader>
      `,
      {
        activeElement: this,
        width: 'auto',
      },
    );
  };

  @mounted()
  #init = () => {
    const removeClickHandle = addListener(this, 'click', this.#onOpen);
    const removeKeydownHandle = addListener(this, 'keydown', commonHandle);
    return () => {
      this.active && ContextMenu.close();
      removeClickHandle();
      removeKeydownHandle();
    };
  };

  render = () => {
    const isEmpty = this.multiple ? !this.value?.length : !this.value;
    return html`
      ${isEmpty
        ? html`<div class="placeholder">${this.placeholder}</div>`
        : this.multiple
          ? html`
              <dy-scroll-box class="values">
                ${(this.value as OptionValue[][]).map((e) => html`<dy-tag small>${e.join(' / ')}</dy-tag>`)}
              </dy-scroll-box>
            `
          : html`<div class="value">${(this.value as OptionValue[]).join(' / ')}</div>`}
      <dy-use class="icon" .element=${icons.expand}></dy-use>
    `;
  };

  showPicker() {
    this.#onOpen();
  }
}
