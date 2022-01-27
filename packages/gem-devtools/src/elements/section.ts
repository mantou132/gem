import { attribute, customElement, Emitter, emitter, GemElement, html, property } from '@mantou/gem';

import { Item, Path, BuildIn } from '../store';
import { theme } from '../theme';

const maybeBuildInPrefix = '[[Gem?]] ';
const buildInPrefix = '[[Gem]] ';

/**
 * @attr name
 * @attr tip
 */
@customElement('devtools-section')
export class Section extends GemElement {
  @attribute name: string;
  @attribute tip: string;
  @property data: Item[] = [];
  @property path: Path | undefined;
  @emitter valueclick: Emitter<Path>;

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
          this.valueclick(path, { composed: true, bubbles: true });
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

  renderItem = (data: Item[]) => {
    return html`
      <ul>
        ${data.map(
          (e) =>
            html`
              <li>
                <span class="name">${this.renderBuildInMark(e.buildIn)}${e.name}</span>
                <span class="sp">:</span>
                <span class="value ${e.type}" title=${e.value}>${e.value}</span>
                ${this.renderInspect(e.path)}
              </li>
            `,
        )}
      </ul>
    `;
  };

  render() {
    const { name, data = [] } = this;
    return html`
      <style>
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
        .name {
          white-space: nowrap;
          color: ${theme.nameColor};
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
        }
        .string {
          color: ${theme.stringValueColor};
        }
        .string:empty::after {
          content: '<empty string>';
          color: ${theme.valueColor};
          font-style: italic;
        }
        .number {
          color: ${theme.numberValueColor};
        }
        .boolean {
          color: ${theme.booleanValueColor};
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
      </style>
      <details open>
        <summary><span class="summary">${name}${this.renderTip()}</span>${this.renderInspect(this.path)}</summary>
        <div>${data.length ? this.renderItem(data) : html`<div class="nodata">no data</div>`}</div>
      </details>
    `;
  }
}
