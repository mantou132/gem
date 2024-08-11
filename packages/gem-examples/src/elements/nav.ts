import { GemElement, html, customElement, shadow, mounted } from '@mantou/gem';

import { EXAMPLES, VERSION } from './env';

@customElement('gem-examples-nav')
@shadow()
export class Nav extends GemElement {
  @mounted()
  #init = () => {
    if (window.top !== window) return;
    this.shadowRoot?.querySelector('.active')?.scrollIntoView({ block: 'center' });
  };

  render() {
    return html`
      <style>
        :host {
          grid-area: nav;
          padding: 2em 0;
          overflow: auto;
          background: #666;
          color: white;
        }
        .header {
          margin-bottom: 1em;
          padding: 0 2em;
        }
        .title {
          font-size: 1.2em;
        }
        .version {
          font-family: monospace;
        }
        ol {
          margin: 0;
          padding: 0;
        }
        li {
          display: contents;
        }
        .group-title {
          margin-block-start: 1.5em;
          padding: 0.5em 2em;
          opacity: 0.3;
          span {
            font-size: 0.875em;
          }
        }
        a {
          padding: 0.5em 2em;
          display: block;
          color: inherit;
          opacity: 0.8;
          line-height: 1.5;
          text-decoration: none;
          text-transform: capitalize;
        }
        a:hover {
          opacity: 1;
        }
        a.active {
          opacity: 1;
          background: #444;
        }
      </style>
      <a class="header" href="https://github.com/mantou132/gem" target="_blank">
        <div class="title">Gem Examples</div>
        <div class="version">version: ${VERSION}</div>
      </a>
      <ol>
        ${Object.entries<typeof EXAMPLES>(
          (Object as any).groupBy(
            EXAMPLES.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
            (e: any) => e.group || '',
          ),
        )
          .map(
            ([group, examples]) =>
              [group, examples, group === '' ? -100 : Math.max(...examples.map((e) => e.order || 0))] as const,
          )
          .sort((a, b) => a[2] - b[2])
          .map(
            ([group, examples]) => html`
              <li>
                <div class="group-title"><span>${group}</span></div>
                <ol>
                  ${examples.map(
                    ({ path = '', name = '' }) => html`
                      <li>
                        <a class=${location.pathname.includes(path) ? 'active' : ''} href=${`../${path}/`}>
                          <div>${name.replace('-', ' ')}</div>
                        </a>
                      </li>
                    `,
                  )}
                </ol>
              </li>
            `,
          )}
      </ol>
    `;
  }
}
