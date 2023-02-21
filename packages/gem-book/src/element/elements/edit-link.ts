import { html, GemElement, customElement, history, connectStore } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { getUserLink, getRemotePath } from '../lib/utils';
import { selfI18n } from '../helper/i18n';
import { theme } from '../helper/theme';
import { bookStore } from '../store';

import { container } from './icons';

import '@mantou/gem/elements/link';
import '@mantou/gem/elements/use';

interface State {
  lastUpdated: string;
  message: string;
  commitUrl: string;
}

const cache: Record<string, unknown> = {};
const fetchData = async (api: string) => {
  if (cache[api]) return cache[api];
  const [commit] = await (await fetch(api)).json();
  cache[api] = commit;
  return commit;
};

/**
 * @attr github
 * @attr srouce-dir
 * @attr source-branch
 */
@customElement('gem-book-edit-link')
@connectStore(selfI18n.store)
export class EditLink extends GemElement<State> {
  state = {
    lastUpdated: '',
    message: '',
    commitUrl: '',
  };

  get lastUpdated() {
    const { lastUpdated } = this.state;
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

  getMdFullPath = () => {
    const { config, lang, links = [] } = bookStore;
    const { sourceDir, base } = config || {};
    const { path } = history.getParams();
    const link = links.find(({ originLink }) => getUserLink(originLink) === path);
    if (!link) return;
    const basePath = base ? `/${base}` : '';
    const sroucePath = sourceDir ? `/${sourceDir}` : '';
    return `${basePath}${sroucePath}${getRemotePath(link.originLink, lang)}`;
  };

  render() {
    const { lastUpdated } = this;
    const { message, commitUrl } = this.state;
    const { config } = bookStore;
    const { github, sourceBranch = '' } = config || {};
    const fullPath = this.getMdFullPath();
    if (!github || !sourceBranch || !fullPath) return;
    return html`
      <style>
        :host {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          padding: 2rem 0;
          justify-content: space-between;
          line-height: 1.5;
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
        .last-updated span {
          opacity: 0.5;
        }
        @media ${mediaQuery.PHONE} {
          gem-link,
          .last-updated {
            white-space: nowrap;
          }
        }
      </style>
      <gem-link class="edit" href=${`${github}/blob/${sourceBranch}${fullPath}`}>
        <gem-use selector="#compose" .root=${container}></gem-use>
        <span>${selfI18n.get('editOnGithub')}</span>
      </gem-link>
      ${lastUpdated &&
      html`
        <div class="last-updated">
          <gem-link class="edit" href=${commitUrl} title=${message}>${selfI18n.get('lastUpdated')}:</gem-link>
          <span>${lastUpdated}</span>
        </div>
      `}
    `;
  }

  mounted() {
    this.effect(
      async () => {
        const { config } = bookStore;
        const { github, sourceBranch = '' } = config || {};
        if (!github) return;
        const repo = new URL(github).pathname;
        const path = this.getMdFullPath();
        if (!path) return;
        const query = new URLSearchParams({
          path,
          page: '1',
          per_page: '1',
          sha: sourceBranch,
        });
        try {
          const api = `https://api.github.com/repos${repo}/commits?${query}`;
          const commit = await fetchData(api);
          const date = commit?.commit?.committer?.date;
          this.setState({
            lastUpdated: date || '',
            message: date ? commit.commit.message : '',
            commitUrl: date ? commit.html_url : '',
          });
        } catch {
          this.setState({ lastUpdated: '' });
        }
      },
      () => [history.getParams().path],
    );
  }
}
