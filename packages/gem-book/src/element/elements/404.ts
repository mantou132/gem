import { adoptedStyle, connectStore, createCSSSheet, css, customElement, GemElement, history, html } from '@mantou/gem';

import { getGithubPath, getUserLink } from '../lib/utils';
import { bookStore } from '../store';
import { selfI18n } from '../helper/i18n';
import { theme } from '../helper/theme';

import { container } from './icons';

import '@mantou/gem/elements/reflect';

const style = createCSSSheet(css`
  :host {
    text-align: center;
  }
  gem-link {
    border-bottom: 1px solid rgba(${theme.textColorRGB}, 0.3);
    color: inherit;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  gem-link:hover {
    border-bottom: 1px solid;
  }
  gem-use {
    width: 18px;
    height: 18px;
    margin-right: 10px;
  }
`);

@customElement('gem-book-404')
@connectStore(selfI18n.store)
@adoptedStyle(style)
export class Meta extends GemElement {
  #getMdFullPath = () => {
    const { links = [] } = bookStore;
    const { path } = history.getParams();
    const parts = path.replace(/\/$/, '').split('/');
    const newFile = parts.pop();
    const parentPath = parts.join('/');
    const link = links.find(({ originLink }) => getUserLink(originLink).startsWith(parentPath));
    if (!link) return;
    return getGithubPath(link.originLink.replace(/\/[^/]*$/, `/${newFile}`));
  };

  render() {
    const { config } = bookStore;
    const { github, sourceBranch = '' } = config || {};
    const fullPath = this.#getMdFullPath();
    const noGithub = !github || !sourceBranch || !fullPath;

    return html`
      <style>
        h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0;
        }
      </style>
      <h1>404 - Not found</h1>
      ${noGithub
        ? ''
        : html`
            <gem-link href=${`${github}/new/${sourceBranch}${fullPath}`}>
              <gem-use selector="#compose" .root=${container}></gem-use>
              <span>${selfI18n.get('createOnGithub')}</span>
            </gem-link>
          `}
      <gem-reflect>
        <meta name="robots" content="noindex" />
      </gem-reflect>
    `;
  }
}
