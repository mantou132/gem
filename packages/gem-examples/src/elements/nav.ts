import { GemElement, html, customElement } from '@mantou/gem';

import { EXAMPLES, VERSION } from './env';

const getGitPageUrl = (name: string) => `../${name}/`;

@customElement('gem-examples-nav')
export class Nav extends GemElement {
  mounted = () => {
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
        ${Object.entries(
          (Object as any).groupBy(
            EXAMPLES.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
            (e: any) => e.group || '',
          ),
        ).map(
          ([group, examples]) => html`
            <li>
              <div class="group-title"><span>${group}</span></div>
              <ol>
                ${(examples as typeof EXAMPLES).map(
                  ({ name = '' }) => html`
                    <li>
                      <a class=${location.pathname.includes(name) ? 'active' : ''} href=${getGitPageUrl(name)}>
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
