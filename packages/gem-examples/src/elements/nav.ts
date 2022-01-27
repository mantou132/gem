import { GemElement, html, customElement, version } from '@mantou/gem';

import { MATADATA, EXAMPLES } from './env';

const getGitPageUrl = (name: string) => `../${name}/`;

const getName = (name: string) => (MATADATA[name].name || name).replace('-', ' ');

@customElement('gem-examples-nav')
export class Nav extends GemElement {
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
        .name {
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
        <div class="name">Gem Examples</div>
        <div class="version">version: ${version}</div>
      </a>
      <ol>
        ${EXAMPLES.sort((a, b) => ((MATADATA[a].order || 0) > (MATADATA[b].order || 0) ? 1 : -1)).map(
          (name) =>
            html`
              <li>
                <a class=${location.pathname.includes(name) ? 'active' : ''} href=${getGitPageUrl(name)}>
                  <div>${getName(name)}</div>
                  <div>${MATADATA[name].desc}</div>
                </a>
              </li>
            `,
        )}
      </ol>
    `;
  }
}
