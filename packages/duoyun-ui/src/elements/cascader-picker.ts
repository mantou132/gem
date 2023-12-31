import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  state,
  emitter,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { getCascaderDeep } from '../lib/utils';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import { ContextMenu } from './contextmenu';
import { BasePickerElement, pickerStyle } from './picker';
import type { Option, DuoyunCascaderElement, OptionValue } from './cascader';

export type { Option } from './cascader';

import './use';
import './cascader';
import './tag';
import './scroll-box';

const style = createCSSSheet(css`
  :host {
    width: 15em;
  }
  .value {
    flex-grow: 1;
    white-space: nowrap;
    display: flex;
    gap: 0.5em;
  }
  .placeholder {
    color: ${theme.describeColor};
  }
`);

/**
 * @customElement dy-cascader-picker
 */
@customElement('dy-cascader-picker')
@adoptedStyle(style)
@adoptedStyle(pickerStyle)
@adoptedStyle(focusStyle)
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

  constructor() {
    super({ focusable: true });
    this.addEventListener('click', this.#onOpen);
    this.addEventListener('keydown', commonHandle);
    this.internals.role = 'combobox';
  }

  #cascader?: DuoyunCascaderElement;

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
          style="margin: -0.4em -1em; min-height: 10em;"
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

  #renderValue = (value: OptionValue[]) => {
    return html`${value.join(' / ')}`;
  };

  #renderMultipleValue = (value: OptionValue[][]) => {
    return html` ${value.map((e) => html`<dy-tag small>${e.join(' / ')}</dy-tag>`)} `;
  };

  mounted = () => {
    this.effect(
      () => {
        if (this.#cascader) {
          this.#cascader.value = this.value;
          this.#cascader.options = this.options;
        }
      },
      () => [this.value, this.options],
    );
    return () => this.active && ContextMenu.close();
  };

  render = () => {
    const isEmpty = this.multiple ? !this.value?.length : !this.value;
    return html`
      <dy-scroll-box class=${classMap({ value: true, placeholder: isEmpty })}>
        ${isEmpty
          ? this.placeholder
          : this.multiple
            ? this.#renderMultipleValue(this.value as OptionValue[][])
            : this.#renderValue(this.value as OptionValue[])}
      </dy-scroll-box>
      <dy-use class="icon" .element=${icons.expand}></dy-use>
    `;
  };

  showPicker() {
    this.#onOpen();
  }
}
