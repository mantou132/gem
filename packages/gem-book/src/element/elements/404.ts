import { adoptedStyle, createCSSSheet, css, customElement, GemElement, html } from '@mantou/gem';

import { getGithubPath, isGitLab } from '../lib/utils';
import { bookStore, locationStore } from '../store';
import { getPlatform, selfI18n } from '../helper/i18n';
import { getUserLink } from '../../common/utils';

import { icons } from './icons';

import '@mantou/gem/elements/reflect';
import '@mantou/gem/elements/title';
import '@mantou/gem/elements/use';

const styles = createCSSSheet(css`
  :scope {
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
`);
@customElement('gem-book-404')
@adoptedStyle(styles)
export class Meta extends GemElement {
  #getMdFullPath = () => {
    const { links = [] } = bookStore;
    const parts = locationStore.path.split('/');
    const newFile = parts.pop() || 'README.md';
    const parentPath = parts.join('/');
    const link = links.find(({ originLink }) => getUserLink(originLink).startsWith(parentPath));
    if (!link) return;
    return [
      getGithubPath(link.originLink.replace(/\/[^/]*$/, '')),
      newFile.toLowerCase().endsWith('.md') ? newFile : `${newFile}.md`,
    ];
  };

  #getGitHubUrl = () => {
    const { config } = bookStore;
    const { github, sourceBranch = '' } = config || {};
    const [fullPath, fileName] = this.#getMdFullPath() || [];
    if (!github || !sourceBranch || !fullPath) return;
    const filenameParams = encodeURIComponent(fileName);
    if (isGitLab()) {
      return `${github}/-/new/${sourceBranch}${fullPath}?file_name=${filenameParams}`;
    }
    return `${github}/new/${sourceBranch}${fullPath}?filename=${filenameParams}`;
  };

  render() {
    const url = this.#getGitHubUrl();

    return html`
      <h1><gem-title inert>Not Found</gem-title></h1>
      ${!url
        ? ''
        : html`
            <div>
              <gem-link href=${url}>
                <gem-use .element=${icons.compose}></gem-use>
                <span>${selfI18n.get('createOnGithub', getPlatform())}</span>
              </gem-link>
            </div>
          `}
      <gem-reflect>
        <meta name="robots" content="noindex" />
      </gem-reflect>
    `;
  }
}
