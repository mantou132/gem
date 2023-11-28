import {
  GemElement,
  html,
  adoptedStyle,
  customElement,
  connectStore,
  attribute,
  property,
  Emitter,
  globalemitter,
  boolattribute,
  classMap,
} from '@mantou/gem';

import { panelStore } from '../store';

import { style } from './section';

type DomStatType = 'ele' | 'con';
export type DomStatInfo = {
  type: DomStatType;
  id: string;
};

/**
 * @customElement devtools-statistics
 */
@customElement('devtools-statistics')
@adoptedStyle(style)
@connectStore(panelStore)
export class devtoolsStatisticsElement extends GemElement {
  @attribute name: string;
  @boolattribute ignore: boolean;
  @attribute type: DomStatType = 'ele';
  @property value = new Array<string>();
  @property highlight?: Array<string>;

  @globalemitter inspectdom: Emitter<DomStatInfo>;

  #parse = (v: string) => {
    // scripts/dom-stat
    return v.split(',');
  };

  renderInspect = (id: string) => {
    return html`
      <span
        class="inspect"
        title="Inspect"
        @click=${(e: Event) => {
          this.inspectdom({ id, type: this.type });
          e.preventDefault();
        }}
      >
        ◉
      </span>
    `;
  };

  renderItem = (value: string[]) => {
    return html`
      <ul>
        ${value.map((e) => {
          const [tag, id] = this.#parse(e);
          return html`
            <li>
              <span class=${classMap({ name: true, element: true, ignore: !this.#highlight.has(e) })}>
                ${`<${tag}>`}
              </span>
              <span class="value"></span>
              ${this.renderInspect(id || tag)}
            </li>
          `;
        })}
      </ul>
    `;
  };

  #highlight = new Set<string>();
  willMount = () => {
    this.memo(() => {
      this.#highlight = new Set(this.highlight || this.value);
    });
  };

  render = () => {
    const { name, value = [] } = this;
    return html`
      <details>
        <summary><span class="summary">${name}${value.length ? `(${value.length})` : ''}</span></summary>
        <div>
          ${this.ignore
            ? html`<div class="nodata">ignore</div>`
            : value.length
            ? this.renderItem(value)
            : html`<div class="nodata">no data</div>`}
        </div>
      </details>
    `;
  };
}
