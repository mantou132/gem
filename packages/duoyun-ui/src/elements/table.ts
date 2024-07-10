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
  shadow,
} from '@mantou/gem/lib/decorators';
import { html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, classMap, StyleObject, isArrayChange } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { readProp } from '../lib/utils';
import { isNullish } from '../lib/types';
import { icons } from '../lib/icons';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';

import { ContextMenu, MenuOrMenuObject } from './contextmenu';
import { DuoyunScrollBoxElement } from './scroll-box';
import type { SelectionChange } from './selection-box';

import './use';
import './placeholder';
import './empty';
import './tooltip';
import './loading';
import './space';
import './selection-box';

const styles = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    width: 100%;
    overflow: auto;
    font-size: 0.875em;
    font-variant-numeric: tabular-nums;
    overscroll-behavior: auto;
    container-type: inline-size;
  }
  table {
    cursor: default;
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    color: ${theme.textColor};
    /* 为啥用户代理在 localhost 下是 normal，但在 StackBlitz 下没有设置？ */
    font-size: inherit;
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
  tbody tr:where(:hover, [data-state-active='?1']) {
    background-color: ${theme.lightBackgroundColor};
  }
  td {
    position: relative;
  }
  table.selection td::after {
    position: absolute;
    display: block;
    content: '';
    /* ellipsis 单元格覆盖不到边框 */
    inset: 0;
    opacity: 0.15;
    cursor: copy;
  }
  tr.selected td::after {
    background-color: ${theme.informativeColor};
  }
  tr.selected td::after {
    cursor: crosshair;
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
  .action:where(:hover, :state(active)) {
    background-color: ${theme.hoverBackgroundColor};
  }
  .side {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 20em;
  }
  caption {
    caption-side: bottom;
    padding: 0.5em;
    margin-block-start: 0.5em;
    font-weight: bold;
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
  // not support `getColSpan`
  visibleWidth?: string;
  tooltip?: string;
  dataIndex?: keyof T | string[];
  render?: (record: T) => string | TemplateResult;
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
@adoptedStyle(styles)
@adoptedStyle(focusStyle)
@connectStore(icons)
@shadow({ delegatesFocus: true })
export class DuoyunTableElement<T = any, K = any> extends DuoyunScrollBoxElement {
  @part static table: string;
  @part static th: string;
  @part static td: string;
  @part static tr: string;
  @part static side: string;

  @attribute caption: string;
  @boolattribute headless: boolean;

  @boolattribute selectable: boolean;
  @property selection?: K[];
  @property selectionContainer?: HTMLElement;

  @emitter select: Emitter<K[]>;
  @emitter itemclick: Emitter<T>;
  @emitter itemcontextmenu: Emitter<ItemContextMenuEventDetail<T>>;

  @property columns?: Column<T>[];
  @property data?: T[] | (T | undefined)[];
  @property getRowStyle?: (record: T) => StyleObject;

  @property noData?: string | TemplateResult;

  @property rowKey?: string | string[];
  @property getKey?: (record: T) => K;
  @property expandedRowRender?: (record: T) => undefined | string | TemplateResult;
  @property getActions?: (record: T, activeElement: HTMLElement) => MenuOrMenuObject;
  @emitter expand: Emitter<T>;

  #selectionSet = new Set<K>();

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

  #openActions = (evt: PointerEvent, record: T) => {
    const activeElement = evt.target as HTMLElement;
    ContextMenu.open(this.getActions!(record, activeElement), { activeElement });
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

  #iconColWidth = '4em'; // 56px

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

  #actionsColumn: Column<T> = {
    title: '',
    width: this.#iconColWidth,
    render: (record) => html`
      <dy-use
        class="action"
        tabindex="0"
        role="button"
        aria-label="Actions"
        .element=${icons.more}
        @keydown=${commonHandle}
        @click=${(evt: PointerEvent) => this.#openActions(evt, record)}
      ></dy-use>
    `,
  };

  #getDefaultStyle = (width?: string): StyleObject => {
    return width?.startsWith('0') ? { fontSize: '0' } : {};
  };

  #columns?: Column<T>[];
  #sidePart?: TemplateResult;
  #headerPart?: TemplateResult;
  willMount = () => {
    this.memo(
      () => {
        this.#columns = this.expandedRowRender && this.columns ? [this.#expandedColumn, ...this.columns] : this.columns;
        if (!this.#columns) return;
        if (this.getActions) this.#columns.push(this.#actionsColumn);

        this.#headerPart = html`
          <colgroup>
            ${this.#columns.map(({ width = 'auto' }) => html`<col style=${styleMap({ width })} /> `)}
          </colgroup>
          ${this.headless
            ? ''
            : html`
                <thead>
                  <tr>
                    ${this.#columns.map(
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
        `;

        let sum = this.#columns
          .filter(({ visibleWidth }) => visibleWidth !== 'auto')
          .map(({ width }) => width || '15em')
          .join(' + ');

        this.#sidePart = html`
          ${this.#columns.map(({ visibleWidth, width }, index) => {
            if (!visibleWidth) return '';

            sum = `${sum} + ${width}`;
            // `visibility: collapse;` 不完美
            return html`
              <style>
                @container (width <= ${visibleWidth === 'auto' ? `calc(${sum})` : visibleWidth}) {
                  :where(th, td, col):nth-of-type(${index + 1}) {
                    width: 0 !important;
                    font-size: 0;
                  }
                }
              </style>
            `;
          })}
        `;
      },
      () => [this.columns, this.headless, this.getActions, this.expandedRowRender],
    );
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
    const columns = this.#columns;
    if (!columns) return html``;

    const rowSpanMemo = columns.map(() => 0);
    return html`
      <table part=${DuoyunTableElement.table} class=${classMap({ selection: this.#selectionSet.size })}>
        ${this.caption
          ? html`
              <caption>
                ${this.caption}
              </caption>
            `
          : ''}
        ${this.#headerPart}
        <tbody>
          ${this.data?.map(
            (record, _rowIndex, _data, colSpanMemo = [0]) => html`
              <tr
                data-state-active
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
      ${this.#sidePart}
      ${this.selectable
        ? html`
            <dy-selection-box
              class="selection"
              .container=${this.selectionContainer}
              @change=${this.#onSelectionBoxChange}
            ></dy-selection-box>
          `
        : ''}
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
