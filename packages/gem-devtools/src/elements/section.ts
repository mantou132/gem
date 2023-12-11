import {
  adoptedStyle,
  attribute,
  createCSSSheet,
  css,
  customElement,
  GemElement,
  html,
  kebabToCamelCase,
  property,
  SheetToken,
} from '@mantou/gem';

import { Item, Path, BuildIn, panelStore } from '../store';
import { theme } from '../theme';
import { inspectValue } from '../scripts/inspect-value';
import { execution } from '../common';
import { setGemPropValue } from '../scripts/set-value';

const maybeBuildInPrefix = '[[Gem?]] ';
const buildInPrefix = '[[Gem]] ';

export const style = createCSSSheet(css`
  :host {
    display: block;
    line-height: 1.5;
    cursor: default;
  }
  .inspect {
    cursor: pointer;
    display: inline-block;
    font-family: monospace;
    width: 1em;
    text-align: center;
    flex-shrink: 0;
    user-select: none;
  }
  summary {
    display: flex;
    background: rgba(${theme.textColorRGB}, 0.075);
    border-bottom: 1px solid rgba(${theme.backgroundColorRGB}, 1);
    padding-right: 1em;
    user-select: none;
  }
  summary:focus {
    outline: none;
  }
  .summary {
    flex-grow: 1;
    display: flex;
    align-items: center;
  }
  .tip {
    cursor: help;
    opacity: 0.3;
    margin-left: 1em;
    box-sizing: border-box;
    padding: 0.2em;
    background-clip: content-box;
    background: currentColor;
    -webkit-text-fill-color: rgba(${theme.backgroundColorRGB}, 1);
    border-radius: 10em;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2em;
    width: 2em;
    font-size: 0.5em;
    font-weight: bolder;
  }
  summary:hover {
    background: rgba(${theme.textColorRGB}, 0.15);
  }
  summary::marker {
    content: '';
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::before {
    content: '▸';
    display: inline-block;
    width: 1em;
    text-align: center;
  }
  details[open] summary::before {
    content: '▾';
  }
  .nodata {
    color: ${theme.valueColor};
    padding: 0 1em;
    font-style: italic;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style-type: none;
    font-family: monospace;
  }
  li {
    display: flex;
    padding: 0 1em;
  }
  li:hover {
    background: rgba(${theme.textColorRGB}, 0.075);
  }
  .name {
    white-space: nowrap;
    color: ${theme.nameColor};
  }
  .name.highlight {
    font-weight: bolder;
  }
  .name.ignore {
    opacity: 0.5;
  }
  .sp {
    padding: 0 0.2em;
  }
  .value {
    flex-shrink: 1;
    flex-grow: 1;
    color: ${theme.valueColor};
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding: 0;
    background: none;
    border: none;
    outline: none;
  }
  .string {
    color: ${theme.stringValueColor};
  }
  .string::placeholder {
    color: ${theme.valueColor};
    font-style: italic;
  }
  .number {
    color: ${theme.numberValueColor};
  }
  .number::-webkit-inner-spin-button,
  .number::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .boolean {
    color: ${theme.booleanValueColor};
  }
  .boolean:hover {
    cursor: pointer;
  }
  .object {
    color: ${theme.objectValueColor};
  }
  .function {
    color: ${theme.functionValueColor};
  }
  .element {
    color: ${theme.elementValueColor};
  }
`);

/**
 * @attr name
 * @attr tip
 */
@customElement('devtools-section')
@adoptedStyle(style)
export class Section extends GemElement {
  @attribute name: string;
  @attribute tip: string;
  @property items: Item[] = [];
  @property path: Path | undefined;

  renderTip = () => {
    if (!this.tip) return '';
    return html`<span class="tip" title=${this.tip} @click=${(e: Event) => e.preventDefault()}>?</span>`;
  };

  renderInspect = (path?: Path) => {
    if (!path) return '';
    return html`
      <span
        class="inspect"
        title="Inspect"
        @click=${(e: Event) => {
          execution(inspectValue, [path, String(SheetToken)]);
          e.preventDefault();
        }}
      >
        ◉
      </span>
    `;
  };

  renderBuildInMark = (buildIn?: BuildIn) => {
    if (!buildIn) return '';
    switch (buildIn) {
      case 1:
        return buildInPrefix;
      default:
        return maybeBuildInPrefix;
    }
  };

  renderItemValue = (item: Item) => {
    const path =
      this.items === panelStore.staticMember
        ? ['constructor', item.name]
        : this.items === panelStore.state
          ? ['state', item.name]
          : this.items === panelStore.observedAttributes || this.items === panelStore.cssStates
            ? [kebabToCamelCase(item.name)]
            : [item.name];
    const onInput = (evt: Event) => {
      execution(setGemPropValue, [path, (evt.target as HTMLInputElement).value]);
    };
    const onInputNumber = (evt: Event) => {
      execution(setGemPropValue, [path, Number((evt.target as HTMLInputElement).value) || 0]);
    };
    const toggleValue = (evt: MouseEvent) => {
      execution(setGemPropValue, [
        path,
        (evt.target as HTMLInputElement).textContent?.trim() === 'true' ? false : true,
      ]);
    };
    switch (item.type) {
      case 'string':
        return html`
          <input
            class="value ${item.type}"
            title="Click to edit"
            placeholder="<empty string>"
            @input=${onInput}
            value=${item.value}
          />
        `;
      case 'number':
        return html`
          <input
            class="value ${item.type}"
            title="Click to edit"
            type="number"
            @input=${onInputNumber}
            value=${item.value}
          />
        `;
      case 'boolean':
        return html`
          <span class="value ${item.type}" title="Click to toggle" @click=${toggleValue}>${item.value}</span>
        `;
      default:
        return html`<span class="value ${item.type}" title=${item.value}>${item.value}</span>`;
    }
  };

  renderItem = (data: Item[]) => {
    return html`
      <ul>
        ${data.map(
          (e) => html`
            <li>
              <span class="name">${this.renderBuildInMark(e.buildIn)}${e.name}</span>
              <span class="sp">:</span>
              ${this.renderItemValue(e)} ${this.renderInspect(e.path)}
            </li>
          `,
        )}
      </ul>
    `;
  };

  render() {
    const { name, items = [] } = this;
    return html`
      <details open>
        <summary><span class="summary">${name}${this.renderTip()}</span>${this.renderInspect(this.path)}</summary>
        <div>${items.length ? this.renderItem(items) : html`<div class="nodata">no data</div>`}</div>
      </details>
    `;
  }
}
