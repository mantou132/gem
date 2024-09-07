import { connectStore, adoptedStyle, customElement, shadow, effect } from '@mantou/gem/lib/decorators';
import { createCSSSheet, GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { css, styleMap, classMap } from '@mantou/gem/lib/utils';
import { useStore } from '@mantou/gem/lib/store';
import { useDecoratorTheme } from '@mantou/gem/helper/theme';

import { theme } from '../lib/theme';

const [elementTheme, updateTheme] = useDecoratorTheme({ top: '', left: '', width: '' });

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    position: fixed;
    z-index: ${theme.popupZIndex};
    display: block;
    pointer-events: none;
    padding: 1em;
    line-height: 1.2;
    width: max-content;
    top: ${elementTheme.top};
    left: ${elementTheme.left};
  }
  .title {
    font-size: 1.125em;
    margin-block-end: 0.5em;
  }
  .body {
    font-size: 0.875em;
    width: ${elementTheme.width};
    padding: 0.75em;
    color: ${theme.textColor};
    background-color: ${theme.backgroundColor};
    border-radius: calc(${theme.normalRound} * 3);
    box-shadow: 0 0.5em 2em rgba(0, 0, 0, calc(${theme.maskAlpha} - 0.1));
  }
  .item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .highlight {
    font-weight: bold;
  }
  .item + .item {
    margin-block-start: 0.4em;
  }
  .color {
    align-self: stretch;
    flex-shrink: 0;
    width: 0.3em;
    margin-block: 0.25em;
  }
  .label-container {
    min-width: 0;
    flex-grow: 1;
  }
  .label {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .value {
    white-space: nowrap;
  }
`);

export type DataItem = {
  label: string | string[];
  value: string | number;
  originValue: number | null;
  color: string;
  highlight?: boolean;
  hidden?: boolean;
};

export type Data = {
  render?: (data: Data) => TemplateResult;
  title?: string | number;
  xValue?: number;
  values?: DataItem[];
};

type Store = {
  data: Data;
  x: number;
  y: number;
  debug: boolean;
};

const [store, update] = useStore<Store>({
  data: {},
  x: 0,
  y: 0,
  debug: false,
});

/**
 * @customElement dy-chart-tooltip
 */
@customElement('dy-chart-tooltip')
@adoptedStyle(style)
@connectStore(store)
@shadow()
export class DuoyunChartTooltipElement extends GemElement {
  static instance: DuoyunChartTooltipElement | null = null;

  static open = (x: number, y: number, data: Data) => {
    update({ x, y, data });
    if (!ChartTooltip.instance) {
      ChartTooltip.instance = new ChartTooltip();
      document.body.append(ChartTooltip.instance);
    }
  };

  static close = () => {
    if (store.debug) return;
    ChartTooltip.instance?.remove();
    ChartTooltip.instance = null;
  };

  @effect()
  #adjust = () => {
    const { x, y } = store;
    const { width, height } = this.getBoundingClientRect();
    if (ChartTooltip.instance) {
      const xx = x + width > innerWidth ? '-100%' : 0;
      const yy = y + height > innerHeight ? '-100%' : 0;
      ChartTooltip.instance.style.transform = `translate(${xx}, ${yy})`;
    }
  };

  @updateTheme()
  #theme = () => {
    const { values, render } = store.data;
    return {
      left: `${store.x}px`,
      top: `${store.y}px`,
      width: `${render ? 'auto' : values && values.length > 5 ? 20 : 15}em`,
    };
  };

  render = () => {
    const { title, values, render } = store.data;
    return html`
      <div class="body" role="tooltip">
        ${render
          ? render(store.data)
          : html`
              ${title ? html`<div class="title">${title}</div>` : ''}
              ${values?.map(({ hidden, color, label, value, highlight }) =>
                hidden
                  ? ''
                  : html`
                      <div class=${classMap({ item: true, highlight: !!highlight })}>
                        ${color ? html`<div class="color" style=${styleMap({ backgroundColor: color })}></div>` : ''}
                        <div class="label-container">
                          ${(Array.isArray(label) ? label : [label]).map(
                            (text) => html`<div class="label">${text}</div>`,
                          )}
                        </div>
                        <div class="value">${value}</div>
                      </div>
                    `,
              )}
            `}
      </div>
    `;
  };
}

export const ChartTooltip = DuoyunChartTooltipElement;
