import {
  connectStore,
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  state,
  focusable,
  aria,
  shadow,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, classMap } from '@mantou/gem/lib/utils';

import { Time } from '../lib/time';
import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { isNotNullish } from '../lib/types';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import type { DuoyunButtonElement } from './button';
import type { DuoyunDatePanelElement } from './date-panel';
import { ContextMenu } from './contextmenu';
import { BasePickerElement, pickerStyle } from './picker';

import './use';
import './date-panel';
import './button';

const style = createCSSSheet(css`
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
`);

/**
 * @customElement dy-date-picker
 * @attr placeholder
 * @attr time
 * @attr clearable
 * @attr disabled
 * @fires change
 * @fires clear
 */
@customElement('dy-date-picker')
@adoptedStyle(pickerStyle)
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(icons)
@focusable()
@aria({ role: 'combobox' })
@shadow()
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

  constructor() {
    super();
    this.addEventListener('click', this.#onOpen);
    this.addEventListener('keydown', commonHandle);
  }

  #onSubmit = ({ detail }: CustomEvent<number>) => {
    this.change(detail);
    ContextMenu.close();
  };

  #onOpen = () => {
    if (this.disabled) return;

    let v: undefined | number = undefined;
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
        ${this.time
          ? html`
              <style>
                .footer {
                  margin-block-start: 2em;
                  display: flex;
                  justify-content: flex-end;
                }
              </style>
              <div class="footer">
                <dy-button disabled @click=${onSubmit} small>${locale.ok}</dy-button>
              </div>
            `
          : ''}
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

  mounted = () => {
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
