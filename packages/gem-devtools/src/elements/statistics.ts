import {
  adoptedStyle,
  attribute,
  boolattribute,
  classMap,
  connectStore,
  customElement,
  GemElement,
  html,
  memo,
  property,
  shadow,
} from '@mantou/gem';

import { execution } from '../common';
import type { DomStatInfo } from '../scripts/inspect-ele';
import { inspectDom } from '../scripts/inspect-ele';
import { panelStore } from '../store';
import { style } from './section';

@customElement('devtools-statistics')
@adoptedStyle(style)
@connectStore(panelStore)
@shadow()
export class devtoolsStatisticsElement extends GemElement {
  @attribute name: string;
  @boolattribute ignore: boolean;
  @attribute type: DomStatInfo['type'] = 'ele';
  @property highlight?: Array<string>;

  @property data = [] as string[];

  #parse = (v: string) => {
    // scripts/dom-stat
    return v.split(',');
  };

  #renderInspect = (id: string) => {
    return html`
      <span
        class="inspect"
        title="Inspect"
        @click=${(e: Event) => {
          execution(inspectDom, [{ id, type: this.type }]);
          e.preventDefault();
        }}
      >
        ◉
      </span>
    `;
  };

  #renderItem = (data: string[]) => {
    return html`
      <ul>
        ${data.map((e) => {
          const [tag, id] = this.#parse(e);
          return html`
            <li>
              <span class=${classMap({ name: true, element: true, ignore: !this.#highlight.has(e) })}>
                ${`<${tag}>`}
              </span>
              <span class="value"></span>
              ${this.#renderInspect(id || tag)}
            </li>
          `;
        })}
      </ul>
    `;
  };

  #highlight = new Set<string>();

  @memo()
  #setHighlight = () => {
    this.#highlight = new Set(this.highlight || this.data);
  };

  render = () => {
    const { name, data = [] } = this;
    return html`
      <details>
        <summary><span class="summary">${name}${data.length ? `(${data.length})` : ''}</span></summary>
        <div>
          ${
            this.ignore
              ? html`<div class="nodata">ignore</div>`
              : data.length
                ? this.#renderItem(data)
                : html`<div class="nodata">no data</div>`
          }
        </div>
      </details>
    `;
  };
}
