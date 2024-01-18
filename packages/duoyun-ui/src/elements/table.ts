// TODO: sticky row/column
import {
  connectStore,
  adoptedStyle,
  customElement,
  attribute,
  emitter,
  Emitter,
  property,
  boolattribute,
  part,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, classMap, StyleObject, isArrayChange } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { readProp } from '../lib/utils';
import { isNullish } from '../lib/types';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import { ContextMenuItem, ContextMenu } from './contextmenu';
import type { SelectionChange } from './selection-box';

import './use';
import './placeholder';
import './empty';
import './tooltip';
import './loading';
import './space';
import './selection-box';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    overflow: auto;
    font-size: 0.875em;
    font-variant-numeric: tabular-nums;
    border-radius: ${theme.normalRound};
  }
  table {
    cursor: default;
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }
  .selection:where([data-selecting], :state(selecting)) ~ table {
    user-select: none;
  }
  .selection ~ table {
    cursor: crosshair;
  }
  thead {
    text-align: -webkit-match-parent;
    text-align: -moz-match-parent;
    text-align: match-parent;
  }
  th {
    font-weight: bold;
  }
  tr {
    border-block-end: 1px solid ${theme.borderColor};
    transition: background 0.1s;
  }
  tbody tr:hover {
    background-color: ${theme.lightBackgroundColor};
  }
  td {
    position: relative;
  }
  tr.selected td::after {
    position: absolute;
    display: block;
    content: '';
    top: 0px;
    left: 0px;
    width: 100%;
    height: calc(100% + 1px);
    opacity: 0.15;
    background-color: ${theme.informativeColor};
  }
  td.ellipsis {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  td.placeholder {
    pointer-events: none;
  }
  th,
  td {
    padding: 0.8em 0.5em;
  }
  .tooltip {
    width: 1em;
  }
  .action {
    cursor: default;
    width: 1.5em;
    padding: 4px;
    border-radius: ${theme.normalRound};
  }
  .action:where(:hover, [data-active], :state(active)) {
    background-color: ${theme.hoverBackgroundColor};
  }
  .side {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 20em;
  }
`);

export type Column<T> = {
  title: string | TemplateResult;
  // th or td
  style?: StyleObject;
  // one line
  ellipsis?: boolean;
  // 0 is hidden
  width?: string;
  tooltip?: string;
  dataIndex?: keyof T | string[];
  render?: (record: T) => string | TemplateResult;
  getActions?: (record: T, evt: HTMLElement) => ContextMenuItem[];
  getColSpan?: (record: T, arr: T[]) => number;
  getRowSpan?: (record: T, arr: T[]) => number;
  data?: Record<string, unknown>;
};

export type Columns<T> = Column<T>[];

export type ItemContextMenuEventDetail<T> = {
  data: T;
  selected: boolean;
  originEvent: MouseEvent;
};

/**
 * @customElement dy-table
 */
@customElement('dy-table')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
@connectStore(icons)
export class DuoyunTableElement<T = any, K = any> extends GemElement {
  @part static table: string;
  @part static th: string;
  @part static td: string;
  @part static tr: string;
  @part static side: string;

  @attribute caption: string;
  @boolattribute headless: boolean;

  @boolattribute selectable: boolean;
  @property selection?: K[];

  @emitter select: Emitter<K[]>;
  @emitter itemclick: Emitter<T>;
  @emitter itemcontextmenu: Emitter<ItemContextMenuEventDetail<T>>;

  @property columns?: Column<T>[];
  @property data?: T[] | (T | undefined)[];
  @property getRowStyle?: (record: T) => StyleObject;

  @property noData?: string | TemplateResult;

  /**@deprecated */
  @property rowKey?: string | string[];
  @property getKey?: (record: T) => K;
  @property expandedRowRender?: (record: T) => undefined | string | TemplateResult;
  @emitter expand: Emitter<T>;

  #selectionSet = new Set<K>();

  constructor() {
    super({ delegatesFocus: true });
  }

  #onSelectionBoxChange = ({ detail: { rect, mode } }: CustomEvent<SelectionChange>) => {
    const selection = new Set(mode === 'new' ? [] : this.#selectionSet);
    const boxWidth = rect.width;
    const boxHeight = rect.height;
    const boxBottom = rect.bottom;
    const boxRight = rect.right;
    const boxLeft = rect.left;
    const boxTop = rect.top;
    const rects = [...this.shadowRoot!.querySelectorAll('tbody tr')].map((e) => e.getBoundingClientRect());
    rects.forEach(({ width, height, bottom, top, left, right }, i) => {
      // rowspan?
      if (
        Math.max(bottom, boxBottom) - Math.min(top, boxTop) < boxHeight + height &&
        Math.max(right, boxRight) - Math.min(left, boxLeft) < boxWidth + width
      ) {
        const item = this.data![i];
        if (!item) return;
        const itemKey = this.#getKey(item);
        if (mode === 'delete') {
          selection.delete(itemKey);
        } else {
          selection.add(itemKey);
        }
      }
    });
    const selectionArr = [...selection];
    if (isArrayChange(this.selection || [], selectionArr)) {
      this.select(selectionArr);
    }
  };

  #onItemClick = (record: T) => {
    if (this.#selectionSet.size) {
      const item = this.#getKey(record);
      const selection = new Set(this.#selectionSet);
      if (this.#selectionSet.has(item)) {
        selection.delete(item);
      } else {
        selection.add(item);
      }
      this.select([...selection]);
    } else {
      this.itemclick(record);
    }
  };

  #onItemContextMenu = (evt: MouseEvent, record: T) => {
    this.itemcontextmenu({
      data: record,
      originEvent: evt,
      selected: this.#selectionSet.has(this.#getKey(record)),
    });
  };

  #openActions = (evt: PointerEvent, menu: ContextMenuItem[]) => {
    ContextMenu.open(menu, {
      activeElement: evt.target as HTMLElement,
      searchable: menu.length > 20,
      maxHeight: '30em',
    });
  };

  #shouldRenderTd = (spanMemo: number[], index: number) => {
    if (spanMemo[index]) {
      spanMemo[index]--;
      return false;
    }
    return true;
  };

  #getSpan = (spanMemo: number[], index: number, span?: number) => {
    if (isNullish(span)) {
      return 1;
    }
    spanMemo[index] = span - 1;
    return span;
  };

  #expandedMap = new Map<K, boolean>();

  #getKey = (record: T) => {
    return this.getKey ? this.getKey(record) : this.rowKey ? readProp(record!, this.rowKey) : record;
  };

  #iconColWidth = '50px';

  #toggleExpand = (record: T) => {
    const key = this.#getKey(record);
    const expanded = !!this.#expandedMap.get(key);
    this.#expandedMap.set(key, !expanded);
    if (!expanded) this.expand(record);
    this.update();
  };

  #expandedColumn: Column<T> = {
    title: '',
    width: this.#iconColWidth,
    render: (record) => html`
      <dy-use
        class="action"
        @click=${() => record && this.#toggleExpand(record)}
        .element=${record && this.#expandedMap.get(this.#getKey(record)) ? icons.expand : icons.right}
      ></dy-use>
    `,
  };

  #getDefaultStyle = (width?: string): StyleObject => {
    return width?.startsWith('0') ? { fontSize: '0' } : {};
  };

  mounted = () => {
    this.memo(
      () => {
        this.#selectionSet = new Set(this.selection);
      },
      () => this.selection || [],
    );
  };

  render = () => {
    if (!this.columns) return html``;
    const columns = this.expandedRowRender ? [this.#expandedColumn, ...this.columns] : this.columns;
    const rowSpanMemo = columns.map(() => 0);
    return html`
      ${this.selectable
        ? html`<dy-selection-box class="selection" @change=${this.#onSelectionBoxChange}></dy-selection-box>`
        : ''}
      <table part=${DuoyunTableElement.table}>
        ${this.caption
          ? html`
              <caption>
                ${this.caption}
              </caption>
            `
          : ''}
        <colgroup>
          ${columns.map(
            ({ width = 'auto', render, getActions }) =>
              html`<col style=${styleMap({ width: !render && getActions ? this.#iconColWidth : width })}></col>`,
          )}
        </colgroup>
        ${this.headless
          ? ''
          : html`
              <thead>
                <tr>
                  ${columns.map(
                    ({ title = '', width, style = this.#getDefaultStyle(width), tooltip }) => html`
                      <th part=${DuoyunTableElement.th} style=${styleMap(style)}>
                        <dy-space size="small">
                          ${title}
                          ${tooltip
                            ? html`
                                <dy-tooltip .content=${tooltip}>
                                  <dy-use class="tooltip" .element=${icons.help}></dy-use>
                                </dy-tooltip>
                              `
                            : ''}
                        </dy-space>
                      </th>
                    `,
                  )}
                </tr>
              </thead>
            `}
        <tbody>
          ${this.data?.map(
            (record, _rowIndex, _data, colSpanMemo = [0]) => html`
              <tr
                @click=${() => record && this.#onItemClick(record)}
                @contextmenu=${(evt: MouseEvent) => record && this.#onItemContextMenu(evt, record)}
                part=${DuoyunTableElement.tr}
                class=${classMap({ selected: record && this.#selectionSet.has(this.#getKey(record)) })}
                style=${record && this.getRowStyle ? styleMap(this.getRowStyle(record)) : ''}
              >
                ${columns.map(
                  (
                    {
                      dataIndex,
                      render,
                      getActions,
                      width,
                      style = this.#getDefaultStyle(width),
                      getRowSpan,
                      getColSpan,
                      ellipsis = false,
                    },
                    colIndex,
                    _arr,
                    rowShouldRender = this.#shouldRenderTd(rowSpanMemo, colIndex),
                    rowSpan = rowShouldRender && record
                      ? this.#getSpan(rowSpanMemo, colIndex, getRowSpan?.(record, this.data as T[]))
                      : 1,
                    colShouldRender = this.#shouldRenderTd(colSpanMemo, 0),
                    colSpan = colShouldRender && record
                      ? this.#getSpan(colSpanMemo, 0, getColSpan?.(record, this.data as T[]))
                      : 1,
                  ) =>
                    rowShouldRender && colShouldRender
                      ? html`
                          <td
                            class=${classMap({ placeholder: !record, ellipsis })}
                            style=${styleMap(style)}
                            part=${DuoyunTableElement.td}
                            rowspan=${rowSpan}
                            colspan=${colSpan}
                          >
                            ${!record
                              ? html`<dy-placeholder ?center=${style.textAlign === 'center'}></dy-placeholder>`
                              : render
                                ? render(record)
                                : getActions
                                  ? html`
                                      <dy-use
                                        class="action"
                                        tabindex="0"
                                        role="button"
                                        aria-label="Actions"
                                        .element=${icons.more}
                                        @keydown=${commonHandle}
                                        @click=${(evt: PointerEvent) =>
                                          this.#openActions(evt, getActions(record, evt.target as HTMLElement))}
                                      ></dy-use>
                                    `
                                  : dataIndex
                                    ? readProp(record, dataIndex)
                                    : ''}
                          </td>
                        `
                      : '',
                )}
              </tr>
              ${this.expandedRowRender && record && this.#expandedMap.get(this.#getKey(record))
                ? html`
                    <tr>
                      <td style=${styleMap({ padding: `0 0 0 ${this.#iconColWidth}` })} colspan=${columns.length}>
                        ${this.expandedRowRender(record) || html`<dy-loading></dy-loading>`}
                      </td>
                    </tr>
                  `
                : ''}
            `,
          )}
        </tbody>
      </table>
      ${!this.data
        ? html`<div class="side" part=${DuoyunTableElement.side}><dy-loading></dy-loading></div>`
        : this.data.length === 0
          ? html`<div class="side" part=${DuoyunTableElement.side}>${this.noData || html`<dy-empty></dy-empty>`}</div>`
          : ''}
    `;
  };

  appendSelection(items: (T | undefined)[]) {
    const selection = new Set(this.#selectionSet);
    items.forEach((item) => item && selection.add(this.#getKey(item)));
    this.select([...selection]);
  }

  removeSelection(items: (T | undefined)[]) {
    const selection = new Set(this.#selectionSet);
    items.forEach((item) => item && selection.delete(this.#getKey(item)));
    this.select([...selection]);
  }
}
