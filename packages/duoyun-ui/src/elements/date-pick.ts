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
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
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
import { ContextMenu } from './menu';

import '@mantou/gem/elements/use';
import './date-panel';
import './button';

const style = createCSSSheet(css`
  :host {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    border: 1px solid ${theme.borderColor};
    border-radius: ${theme.normalRound};
    line-height: 1.2;
    padding: 0.5em;
    gap: 0.5em;
    font-size: 0.875em;
    box-sizing: border-box;
    width: 15em;
  }
  :host(:where(:--active, [data-active])) {
    background-color: ${theme.lightBackgroundColor};
  }
  :host([disabled]) {
    cursor: not-allowed;
    border-color: transparent;
    background: ${theme.disabledColor};
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
  gem-use {
    width: 1.2em;
    color: ${theme.borderColor};
  }
  :host(:where(:hover, :--active, [data-active])) gem-use {
    color: ${theme.textColor};
  }
  .iconwrap {
    display: flex;
  }
  .close,
  .clearable:hover .date {
    display: none;
  }
  .clearable:hover .close {
    display: inline-flex;
  }
`);

export interface Option {
  label: string | TemplateResult;
  value?: any;
}

/**
 * @customElement dy-date-pick
 */
@customElement('dy-date-pick')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(icons)
export class DuoyunDatePickElement extends GemElement {
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
    this.tabIndex = 0;
    this.internals.role = 'combobox';
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
          style="border: none;"
          .highlights=${this.#value ? [[this.#value, this.#value]] : undefined}
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
      <div class=${classMap({ iconwrap: true, clearable: this.clearable })}>
        <gem-use class="date" .element=${icons.date}></gem-use>
        <gem-use class="close" @click=${this.#onClear} .element=${icons.close}></gem-use>
      </div>
    `;
  };
}
