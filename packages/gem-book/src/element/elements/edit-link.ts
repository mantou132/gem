import {
  html,
  GemElement,
  customElement,
  connectStore,
  adoptedStyle,
  css,
  createState,
  memo,
  effect,
  aria,
} from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { getGithubPath, isGitLab } from '../lib/utils';
import { getPlatform, selfI18n } from '../helper/i18n';
import { bookStore, locationStore } from '../store';
import { theme } from '../helper/theme';

import { icons } from './icons';

import '@mantou/gem/elements/link';
import '@mantou/gem/elements/use';

const styles = css`
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
    color: rgb(from ${theme.textColor} r g b / 0.5);
  }
  @media ${mediaQuery.PHONE} {
    gem-link,
    .last-updated {
      white-space: nowrap;
    }
  }
`;

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
@aria({ role: 'complementary' })
export class EditLink extends GemElement {
  #state = createState({
    lastUpdated: '',
    message: '',
    commitUrl: '',
  });

  #fullPath = '';

  @memo()
  #calc = () => {
    const link = bookStore.getCurrentLink?.();
    if (!link) return (this.#fullPath = '');
    this.#fullPath = getGithubPath(link.originLink);
  };

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

  #fetchCommit = async () => {
    const { config } = bookStore;
    const { github, sourceBranch = '' } = config || {};
    if (!github) return;
    const repo = new URL(github).pathname;
    if (isGitLab()) {
      const api = `${new URL(github).origin}/api/v4/projects/${encodeURIComponent(
        repo.replace(/^\//, ''),
      )}/repository/commits?${new URLSearchParams({
        path: this.#fullPath.replace(/^\//, ''),
        page: '1',
        per_page: '1',
        ref_name: sourceBranch,
      })}`;
      const commit = await fetchData(api);
      return {
        date: commit.committed_date,
        message: commit.message,
        commitUrl: commit.web_url,
      };
    } else {
      const api = `https://api.github.com/repos${repo}/commits?${new URLSearchParams({
        path: this.#fullPath,
        page: '1',
        per_page: '1',
        sha: sourceBranch,
      })}`;
      const commit = await fetchData(api);
      return {
        date: commit?.commit?.committer?.date,
        message: commit.commit.message,
        commitUrl: commit.html_url,
      };
    }
  };

  @effect((i) => [i.#fullPath])
  #fetchData = async () => {
    const { config } = bookStore;
    const { github } = config || {};
    if (!github) return;
    if (!this.#fullPath) return;
    try {
      const commit = await this.#fetchCommit();
      this.#state({
        lastUpdated: commit?.date || '',
        message: commit?.date ? commit.message : '',
        commitUrl: commit?.date ? commit.commitUrl : '',
      });
    } catch {
      this.#state({ lastUpdated: '' });
    }
  };

  #getGitHubUrl = () => {
    const { config } = bookStore;
    const { github, sourceBranch = '' } = config || {};
    if (!github || !sourceBranch || !this.#fullPath) return;
    // 兼容 github/gitlab
    return `${github}/edit/${sourceBranch}${this.#fullPath}`;
  };

  render() {
    const { message, commitUrl } = this.#state;
    const lastUpdated = this.#getLastUpdated();
    const url = this.#getGitHubUrl();
    if (!url) return;
    return html`
      <gem-link href=${url}>
        <gem-use .element=${icons.compose}></gem-use>
        <span>${selfI18n.get('editOnGithub', getPlatform())}</span>
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
