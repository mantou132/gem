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
import type { BasePickerElement, Option } from './picker';
import { pickerStyle } from './picker';

import './use';

const style = css`
  :host {
    width: 12em;
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
`;

export interface GroupedPickerOption extends Omit<Option, 'value' | 'children'> {
  value: string;
  children?: Option[];
}

export type GroupedPickerValue = Record<string, any>;

export interface GroupedPickerChange {
  group: string;
  value: any;
}

@customElement('dy-grouped-picker')
@adoptedStyle(style)
@adoptedStyle(pickerStyle)
@adoptedStyle(focusStyle)
@connectStore(icons)
@shadow()
@aria({ focusable: true, role: 'combobox' })
export class DuoyunGroupedPickerElement extends GemElement implements BasePickerElement {
  @attribute placeholder: string;
  @boolattribute disabled: boolean;
  @boolattribute borderless: boolean;
  @boolattribute fit: boolean;

  @state active: boolean;

  @property options?: GroupedPickerOption[];
  @property value?: GroupedPickerValue;
  @property renderValue?: (value?: GroupedPickerValue) => string | TemplateResult | undefined;

  @globalemitter change: Emitter<GroupedPickerChange>;

  #optionValue = (option: Option) => option.value ?? option.label;

  #current = (group: GroupedPickerOption) => {
    const currentValue = this.value?.[group.value];
    return group.children?.find((option) => this.#optionValue(option) === currentValue);
  };

  #genMenu = (group: GroupedPickerOption): ContextMenuItem => {
    const currentValue = this.value?.[group.value];
    const current = this.#current(group);
    return {
      text: group.label,
      description: group.description,
      tag: current?.label,
      menu: group.children?.map((option) => {
        const value = this.#optionValue(option);
        return {
          text: option.label,
          description: option.description,
          selected: value === currentValue,
          handle: () => {
            if (value !== currentValue) this.change({ group: group.value, value });
          },
        };
      }),
    };
  };

  #onOpen = async () => {
    const options = this.options?.filter((group) => group.children?.length);
    if (this.disabled || !options?.length) return;
    await ContextMenu.open(options.map(this.#genMenu), {
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
    if (this.active) this.#onOpen();
  };

  render = () => {
    const current = this.options?.length ? this.#current(this.options[0]) : undefined;
    const value = this.renderValue?.(this.value) ?? current?.label;
    return html`
      <div v-if=${value == null} class="placeholder">${this.placeholder}</div>
      <div v-else class="value">${value}</div>
      <dy-use .element=${icons.expand}></dy-use>
    `;
  };

  showPicker() {
    this.#onOpen();
  }
}
