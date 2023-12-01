import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  state,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { getCascaderDeep } from '../lib/utils';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import { ContextMenu } from './menu';
import { pickerStyle } from './pick';
import type { Option, DuoyunCascaderElement } from './cascader';

import './use';
import './cascader';
import './tag';

const style = createCSSSheet(css`
  :host {
    width: 15em;
  }
  .value {
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    gap: 0.5em;
  }
  .placeholder {
    color: ${theme.describeColor};
  }
`);

/**
 * @customElement dy-cascader-pick
 */
@customElement('dy-cascader-pick')
@adoptedStyle(style)
@adoptedStyle(pickerStyle)
@adoptedStyle(focusStyle)
export class DuoyunCascaderPickElement extends GemElement {
  @attribute placeholder: string;
  @property options: Option[];
  @boolattribute fit: boolean;
  @boolattribute disabled: boolean;
  @boolattribute multiple: boolean;
  @globalemitter change: Emitter<(string | number)[][] | (string | number)[]>;
  @property value?: (string | number)[][] | (string | number)[];
  @state active: boolean;

  constructor() {
    super();
    this.addEventListener('click', this.#onOpen);
    this.addEventListener('keydown', commonHandle);
    this.tabIndex = 0;
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

  #onOpen = () => {
    if (this.disabled || !this.options || !this.options.length) return;
    ContextMenu.open(
      html`
        <dy-cascader
          style="margin: -0.4em -1em; min-height: 10em;"
          .options=${this.options}
          .value=${this.value}
          @change=${(evt: CustomEvent) => this.#onChange(evt)}
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

  #renderValue = (value: (string | number)[]) => {
    return html`${value.join(' / ')}`;
  };

  #renderMultipleValue = (value: (string | number)[][]) => {
    return html` ${value.map((e) => html`<dy-tag small>${e.join(' / ')}</dy-tag>`)} `;
  };

  mounted = () => {
    this.effect(
      () => {
        if (this.#cascader) {
          this.#cascader.value = this.value;
        }
      },
      () => [this.value],
    );
    return () => this.active && ContextMenu.close();
  };

  render = () => {
    const isEmpty = this.multiple ? !this.value?.length : !this.value;
    return html`
      <div class=${classMap({ value: true, placeholder: isEmpty })}>
        ${isEmpty
          ? this.placeholder
          : this.multiple
            ? this.#renderMultipleValue(this.value as (string | number)[][])
            : this.#renderValue(this.value as (string | number)[])}
      </div>
      <dy-use class="icon" .element=${icons.expand}></dy-use>
    `;
  };
}
