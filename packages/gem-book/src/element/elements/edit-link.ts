import {
  html,
  GemElement,
  customElement,
  connectStore,
  css,
  adoptedStyle,
  createCSSSheet,
  createState,
  memo,
  effect,
} from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { getGithubPath } from '../lib/utils';
import { selfI18n } from '../helper/i18n';
import { bookStore, locationStore } from '../store';

import { icons } from './icons';

import '@mantou/gem/elements/link';
import '@mantou/gem/elements/use';

const styles = createCSSSheet(css`
  :scope {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    padding-block: 6rem 2rem;
    box-sizing: border-box;
    justify-content: space-between;
    line-height: 1.5;
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
  .last-updated gem-link {
    opacity: 0.5;
  }
  @media ${mediaQuery.PHONE} {
    gem-link,
    .last-updated {
      white-space: nowrap;
    }
  }
`);

const cache: Record<string, unknown> = {};
const fetchData = async (api: string) => {
  if (cache[api]) return cache[api];
  const [commit] = await (await fetch(api)).json();
  cache[api] = commit;
  return commit;
};

@customElement('gem-book-edit-link')
@connectStore(locationStore)
@adoptedStyle(styles)
export class EditLink extends GemElement {
  #state = createState({
    lastUpdated: '',
    message: '',
    commitUrl: '',
  });

  #fullPath = '';

  @memo()
  #calc = () => (this.#fullPath = this.#getMdFullPath());

  #getLastUpdated() {
    const { lastUpdated } = this.#state;
    return (
      lastUpdated &&
      new Intl.DateTimeFormat(bookStore.lang || 'default', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(lastUpdated))
    );
  }

  #getMdFullPath = () => {
    const link = bookStore.getCurrentLink?.();
    if (!link) return '';
    return getGithubPath(link.originLink);
  };

  @effect((i) => [i.#fullPath])
  #fetchData = async () => {
    const { config } = bookStore;
    const { github, sourceBranch = '' } = config || {};
    if (!github) return;
    const repo = new URL(github).pathname;
    if (!this.#fullPath) return;
    const query = new URLSearchParams({
      path: this.#fullPath,
      page: '1',
      per_page: '1',
      sha: sourceBranch,
    });
    try {
      const api = `https://api.github.com/repos${repo}/commits?${query}`;
      const commit = await fetchData(api);
      const date = commit?.commit?.committer?.date;
      this.#state({
        lastUpdated: date || '',
        message: date ? commit.commit.message : '',
        commitUrl: date ? commit.html_url : '',
      });
    } catch {
      this.#state({ lastUpdated: '' });
    }
  };

  render() {
    const lastUpdated = this.#getLastUpdated();
    const { message, commitUrl } = this.#state;
    const { config } = bookStore;
    const { github, sourceBranch = '' } = config || {};
    if (!github || !sourceBranch || !this.#fullPath) return;
    return html`
      <gem-link href=${`${github}/edit/${sourceBranch}${this.#fullPath}`}>
        <gem-use .element=${icons.compose}></gem-use>
        <span>${selfI18n.get('editOnGithub')}</span>
      </gem-link>
      ${lastUpdated &&
      html`
        <div class="last-updated">
          <span>${selfI18n.get('lastUpdated')}:</span>
          <gem-link href=${commitUrl} title=${message}>${lastUpdated}</gem-link>
        </div>
      `}
    `;
  }
}
