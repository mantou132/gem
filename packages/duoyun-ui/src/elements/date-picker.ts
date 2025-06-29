import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  boolattribute,
  connectStore,
  customElement,
  emitter,
  globalemitter,
  mounted,
  property,
  shadow,
  state,
} from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';
import { addListener, classMap } from '@mantou/gem/lib/utils';

import { commonHandle } from '../lib/hotkeys';
import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { focusStyle } from '../lib/styles';
import { theme } from '../lib/theme';
import { Time } from '../lib/time';
import { isNotNullish } from '../lib/types';
import type { DuoyunButtonElement } from './button';
import { ContextMenu } from './contextmenu';
import type { DuoyunDatePanelElement } from './date-panel';
import type { BasePickerElement } from './picker';
import { pickerStyle } from './picker';

import './use';
import './date-panel';
import './button';

const style = css`
  :host {
    width: 15em;
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
  .icon {
    display: flex;
  }
  .close,
  :host(:not([disabled])) .clearable:hover .date {
    display: none;
  }
  :host(:not([disabled])) .clearable:hover .close {
    display: inline-flex;
  }
`;

@customElement('dy-date-picker')
@adoptedStyle(pickerStyle)
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(icons)
@shadow()
@aria({ focusable: true, role: 'combobox' })
export class DuoyunDatePickerElement extends GemElement implements BasePickerElement {
  @attribute placeholder: string;
  @boolattribute time: boolean;
  @boolattribute clearable: boolean;
  @boolattribute disabled: boolean;

  @state active: boolean;
  @property value?: number;
  @globalemitter change: Emitter<number>;
  @emitter clear: Emitter;

  get #value() {
    return isNotNullish(this.value) ? this.value : undefined;
  }

  get #valueString() {
    return this.#value && new Time(this.#value).format(this.time ? undefined : 'YYYY-MM-DD');
  }

  #onSubmit = ({ detail }: CustomEvent<number>) => {
    this.change(detail);
    ContextMenu.close();
  };

  #onOpen = () => {
    if (this.disabled) return;

    let v: undefined | number;
    const onChange = ({ detail, target }: CustomEvent<number>) => {
      const panel = target as DuoyunDatePanelElement;
      panel.highlights = [];
      panel.value = detail;
      const root = panel.getRootNode() as ShadowRoot;
      const button = root.querySelector('dy-button') as DuoyunButtonElement;
      button.disabled = false;
      v = detail;
    };
    const onSubmit = () => {
      if (isNotNullish(v)) {
        this.change(v);
        ContextMenu.close();
      }
    };
    ContextMenu.open(
      html`
        <dy-date-panel
          style="border: none; border-radius: 0; margin: -0.4em;"
          .value=${this.#value}
          ?time=${this.time}
          @change=${this.time ? onChange : this.#onSubmit}
        ></dy-date-panel>
        <style v-if=${this.time}>
          .footer {
            margin-block-start: 2em;
            display: flex;
            justify-content: flex-end;
          }
        </style>
        <div v-if=${this.time} class="footer">
          <dy-button disabled @click=${onSubmit} small>${locale.ok}</dy-button>
        </div>
      `,
      {
        activeElement: this,
        width: this.time ? '30em' : undefined,
      },
    );
  };

  #onClear = (e: Event) => {
    e.stopPropagation();
    this.clear(null);
  };

  @mounted()
  #init = () => {
    addListener(this, 'click', this.#onOpen);
    addListener(this, 'keydown', commonHandle);
    return () => this.active && ContextMenu.close();
  };

  render = () => {
    return html`
      <div class=${classMap({ value: true, placeholder: !this.#value })}>${this.#valueString || this.placeholder}</div>
      <div class=${classMap({ icon: true, clearable: this.clearable })}>
        <dy-use class="date" .element=${icons.date}></dy-use>
        <dy-use class="close" @click=${this.#onClear} .element=${icons.close}></dy-use>
      </div>
    `;
  };

  showPicker() {
    this.#onOpen();
  }
}
