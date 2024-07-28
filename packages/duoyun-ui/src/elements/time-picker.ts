import {
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
import { GemElement, html, createCSSSheet } from '@mantou/gem/lib/element';
import { css, classMap } from '@mantou/gem/lib/utils';

import { Time } from '../lib/time';
import { theme } from '../lib/theme';
import { icons } from '../lib/icons';
import { locale } from '../lib/locale';
import { isNotNullish } from '../lib/types';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import { ContextMenu } from './contextmenu';
import { BasePickerElement, pickerStyle } from './picker';
import type { DuoyunButtonElement } from './button';
import type { DuoyunTimePanelElement } from './time-panel';

import './time-panel';

const style = createCSSSheet(css`
  :host {
    width: 10em;
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
 * @customElement dy-time-picker
 */
@customElement('dy-time-picker')
@adoptedStyle(style)
@adoptedStyle(pickerStyle)
@adoptedStyle(focusStyle)
@focusable()
@aria({ role: 'combobox' })
@shadow()
export class DuoyunTimePickerElement extends GemElement implements BasePickerElement {
  @attribute placeholder: string;
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
    return this.#value && new Time(this.#value).format('HH:mm:ss');
  }

  constructor() {
    super();
    this.addEventListener('click', this.#onOpen);
    this.addEventListener('keydown', commonHandle);
  }

  #onOpen = () => {
    if (this.disabled) return;

    let v: undefined | number = undefined;
    const onChange = ({ detail, target }: CustomEvent<number>) => {
      const panel = target as DuoyunTimePanelElement;
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
        <div class="container">
          <style>
            .container {
              display: flex;
              flex-direction: column;
              height: 46vh;
            }
            dy-time-panel {
              box-sizing: border-box;
              height: 0;
              flex-grow: 1;
            }
            .footer {
              flex-shrink: 0;
              margin-block-start: 1em;
              display: flex;
              justify-content: flex-end;
            }
          </style>
          <dy-time-panel .value=${this.value} @change=${onChange}></dy-time-panel>
          <div class="footer">
            <dy-button disabled @click=${onSubmit} small>${locale.ok}</dy-button>
          </div>
        </div>
      `,
      {
        activeElement: this,
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
        <dy-use class="date" .element=${icons.schedule}></dy-use>
        <dy-use class="close" @click=${this.#onClear} .element=${icons.close}></dy-use>
      </div>
    `;
  };

  showPicker() {
    this.#onOpen();
  }
}
