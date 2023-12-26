import { connectStore, customElement, GemElement, history, html } from '@mantou/gem';

import { getGithubPath, getUserLink } from '../lib/utils';
import { bookStore } from '../store';
import { selfI18n } from '../helper/i18n';

import { icons } from './icons';

import '@mantou/gem/elements/reflect';
import '@mantou/gem/elements/title';

@customElement('gem-book-404')
@connectStore(selfI18n.store)
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
        :host {
          text-align: center;
        }
        h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0;
        }
        gem-link {
          color: inherit;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }
        gem-link:hover {
          opacity: 0.8;
        }
        gem-use {
          width: 18px;
          height: 18px;
          margin-right: 10px;
        }
      </style>
      <h1><gem-title inert>Not Found</gem-title></h1>
      ${noGithub
        ? ''
        : html`
            <div>
              <gem-link href=${`${github}/new/${sourceBranch}${fullPath}`}>
                <gem-use .element=${icons.compose}></gem-use>
                <span>${selfI18n.get('createOnGithub')}</span>
              </gem-link>
            </div>
          `}
      <gem-reflect>
        <meta name="robots" content="noindex" />
      </gem-reflect>
    `;
  }
}
