import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  aria,
  attribute,
  customElement,
  emitter,
  part,
  property,
  shadow,
} from '@mantou/gem/lib/decorators';
import { css, GemElement, html, type TemplateResult } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';

import { locale } from '../lib/locale';
import { theme } from '../lib/theme';
import { DyPromise } from '../lib/utils';
import { Sheet, type SheetOptions, type TapSheetElement } from './sheet';

import './button';
import './scroll-box';
import './use';

const style = css`
  :host(:where(:not([hidden]))) {
    display: block;
    color: ${theme.textColor};
  }
  .header {
    padding: 0 0 0.9em;
    text-align: center;
  }
  .heading {
    color: ${theme.highlightColor};
    font-size: 1em;
    font-weight: 600;
    line-height: 1.35;
  }
  .description {
    margin-block-start: 0.3em;
    color: ${theme.describeColor};
    font-size: 0.875em;
    line-height: 1.45;
  }
  .group {
    border-block-start: 1px solid ${theme.borderColor};
  }
  .group:first-child {
    border-block-start: 0;
  }
  .group + .group {
    border-block-start: 0.5em solid ${theme.lightBackgroundColor};
  }
  .group.grid + .group.grid {
    border-block-start: 1px solid ${theme.borderColor};
  }
  .group-label {
    padding: 0.65em 1.25em;
    color: ${theme.describeColor};
    font-size: 0.75em;
    line-height: 1.3;
    background: ${theme.lightBackgroundColor};
    border-block-end: 1px solid ${theme.borderColor};
  }
  .group:not(.grid) .group-label {
    text-align: center;
  }
  .grid .actions {
    display: flex;
    gap: 0.5em;
    justify-content: safe center;
    padding-block: 0.9em 1em;
  }
  .grid:first-child .actions {
    padding-block-start: 0;
  }
  .grid .group-label + .actions {
    padding-block-start: 0.25em;
  }
  .action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 3.4em;
    box-sizing: border-box;
    padding: 0.7em 1.25em;
    border: 0;
    border-block-end: 1px solid ${theme.borderColor};
    background: transparent;
    color: ${theme.primaryColor};
    font: inherit;
    text-align: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .action:last-child {
    border-block-end: 0;
  }
  .action:active:not(:disabled) {
    background: ${theme.hoverBackgroundColor};
  }
  .action:disabled {
    color: ${theme.describeColor};
    cursor: not-allowed;
    opacity: 0.45;
  }
  .action.danger {
    color: ${theme.negativeColor};
  }
  .content {
    min-width: 0;
  }
  .label {
    overflow-wrap: anywhere;
  }
  .detail {
    margin-block-start: 0.2em;
    color: ${theme.describeColor};
    font-size: 0.75em;
    line-height: 1.35;
  }
  .grid .action {
    flex: 0 0 calc((100% - 1.5em) / 4);
    flex-direction: column;
    justify-content: flex-start;
    gap: 0.5em;
    min-width: 0;
    min-height: 5.75em;
    padding: 0.7em 0.25em;
    border-block-end: 0;
    border-radius: ${theme.normalRound};
  }
  .grid .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 2.75em;
    height: 2.75em;
    padding: 0.625em;
    flex-shrink: 0;
    border-radius: calc(${theme.normalRound} * 2);
    color: ${theme.highlightColor};
    background: ${theme.hoverBackgroundColor};
  }
  .grid .danger .icon {
    color: ${theme.negativeColor};
  }
  .grid .content {
    width: 100%;
  }
  .grid .label {
    font-size: 0.8125em;
    line-height: 1.3;
  }
  .grid .detail {
    font-size: 0.6875em;
  }
  .cancel {
    padding-block-start: 0.75em;
    border-block-start: 0.5em solid ${theme.lightBackgroundColor};
  }
  .cancel-button {
    width: 100%;
  }
`;

export type ActionSheetMode = 'button' | 'grid';

export interface ActionSheetAction<T = unknown> {
  label: string | TemplateResult;
  value?: T;
  description?: string | TemplateResult;
  icon?: string | Element | DocumentFragment;
  danger?: boolean;
  disabled?: boolean;
  handler?: (action: ActionSheetAction<T>) => void | Promise<void>;
}

export interface ActionSheetGroup<T = unknown> {
  label?: string | TemplateResult;
  actions: ActionSheetAction<T>[];
  mode?: ActionSheetMode;
}

export interface ActionSheetOptions<T = unknown> extends Pick<SheetOptions, 'maskClosable'> {
  title?: string | TemplateResult;
  description?: string | TemplateResult;
  actions?: ActionSheetAction<T>[];
  groups?: ActionSheetGroup<T>[];
  mode?: ActionSheetMode;
  cancelText?: string;
}

@customElement('tap-action-sheet')
@adoptedStyle(style)
@aria({ role: 'menu' })
@shadow()
export class TapActionSheetElement<T = unknown> extends GemElement {
  @part static header: string;
  @part static heading: string;
  @part static description: string;
  @part static group: string;
  @part static groupLabel: string;
  @part static action: string;
  @part static cancel: string;

  @attribute cancelText: string;
  @attribute mode: ActionSheetMode;
  @property heading?: string | TemplateResult;
  @property description?: string | TemplateResult;
  @property actions?: ActionSheetAction<T>[];
  @property groups?: ActionSheetGroup<T>[];

  @emitter select: Emitter<ActionSheetAction<T>>;
  @emitter cancel: Emitter;

  static open<T = unknown>(options: ActionSheetOptions<T>) {
    const actionSheet = new TapActionSheetElement<T>();
    actionSheet.heading = options.title;
    actionSheet.description = options.description;
    actionSheet.actions = options.actions;
    actionSheet.groups = options.groups;
    actionSheet.mode = options.mode || 'button';
    actionSheet.cancelText = options.cancelText || '';

    const sheetPromise = Sheet.open({
      body: html`${actionSheet}`,
      gesture: false,
      maskClosable: options.maskClosable !== false,
    });

    return DyPromise.new<
      ActionSheetAction<T> | undefined,
      { actionSheet: TapActionSheetElement<T>; sheet: TapSheetElement }
    >(
      (resolve) => {
        let settled = false;
        const finish = (action?: ActionSheetAction<T>) => {
          if (settled) return;
          settled = true;
          resolve(action);
          sheetPromise.sheet.close(null);
        };
        actionSheet.addEventListener('select', (evt) => finish((evt as CustomEvent<ActionSheetAction<T>>).detail));
        actionSheet.addEventListener('cancel', () => finish());
        sheetPromise.then(() => finish());
      },
      { actionSheet, sheet: sheetPromise.sheet },
    );
  }

  #select = async (action: ActionSheetAction<T>) => {
    if (action.disabled) return;
    await action.handler?.(action);
    this.select(action);
  };

  #renderAction = (action: ActionSheetAction<T>, mode: ActionSheetMode) => html`
    <button
      type="button"
      role="menuitem"
      class=${classMap({ action: true, danger: !!action.danger })}
      part=${TapActionSheetElement.action}
      ?disabled=${!!action.disabled}
      @click=${() => this.#select(action)}
    >
      <tap-use v-if=${mode === 'grid' && !!action.icon} class="icon" .element=${action.icon}></tap-use>
      <span class="content">
        <div class="label">${action.label}</div>
        <div v-if=${!!action.description} class="detail">${action.description}</div>
      </span>
    </button>
  `;

  render = () => {
    const groups = this.groups || (this.actions ? [{ actions: this.actions }] : []);
    const hasHeader = !!this.heading || !!this.description;
    return html`
      <div v-if=${hasHeader} class="header" part=${TapActionSheetElement.header}>
        <div v-if=${!!this.heading} class="heading" part=${TapActionSheetElement.heading}>${this.heading}</div>
        <div v-if=${!!this.description} class="description" part=${TapActionSheetElement.description}>
          ${this.description}
        </div>
      </div>
      ${groups.map((group) => {
        const mode = group.mode || this.mode || 'button';
        const actions = group.actions.map((action) => this.#renderAction(action, mode));
        return html`
          <div
            class=${classMap({ group: true, grid: mode === 'grid' })}
            part=${TapActionSheetElement.group}
          >
            <div v-if=${!!group.label} class="group-label" part=${TapActionSheetElement.groupLabel}>
              ${group.label}
            </div>
            <tap-scroll-box class="actions">${actions}</tap-scroll-box>
          </div>
        `;
      })}
      <div class="cancel" part=${TapActionSheetElement.cancel}>
        <tap-button class="cancel-button" color="cancel" @click=${() => this.cancel(null)}>
          ${this.cancelText || locale.cancel}
        </tap-button>
      </div>
    `;
  };
}

export const ActionSheet = TapActionSheetElement;
