import { adoptedStyle, customElement, GemElement, html, property, shadow, template } from '@mantou/gem';

import { execution } from '../common';
import { inspectMismatch } from '../scripts/ssr';
import type { SSRStatus } from '../store';
import { style } from './section';

const TIP = 'Server and client templates differ, the server content was discarded and rendered on the client';

@customElement('devtools-ssr')
@adoptedStyle(style)
@shadow()
export class DevtoolsSSRElement extends GemElement {
  @property status?: SSRStatus;

  #renderInspect = (index: number) => {
    return html`
      <span
        class="inspect"
        title="Inspect"
        @click=${(e: Event) => {
          execution(inspectMismatch, [index]);
          e.preventDefault();
        }}
      >
        ◉
      </span>
    `;
  };

  @template()
  #content = () => {
    const { render, lazy, mismatches } = this.status!;
    return html`
      <details open>
        <summary><span class="summary">SSR</span></summary>
        <ul>
          <li>
            <span class="name">render</span>
            <span class="sp">:</span>
            <span class="value" title=${render}>${render}</span>
          </li>
          <li v-if=${!!lazy}>
            <span class="name">lazy</span>
            <span class="sp">:</span>
            <span class="value" title=${lazy}>${lazy}</span>
          </li>
          ${mismatches.map(
            ({ reason, template }, index) => html`
              <li>
                <span class="name warning" title=${TIP}>${reason} mismatch</span>
                <span class="sp">:</span>
                <span class="value string" title=${template}>${template}</span>
                ${this.#renderInspect(index)}
              </li>
            `,
          )}
        </ul>
      </details>
    `;
  };
}
