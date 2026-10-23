import { adoptedStyle, css, effect, GemElement, html, memo, property, template } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';
import { page } from '@mantou/gemkit';

import { i18n } from '$gemkit/i18n';
import { trackPageView } from '../lib/ga';
import { icons } from '../lib/icons';
import { markdownStyle } from '../lib/markdown-style';
import { isGitLab } from '../lib/site';
import { htmlTemplate } from '../lib/template';
import { theme } from '../lib/theme';
import type { Doc, Home } from '../lib/types';
import { bookStore } from '../plugin';

// 文档中使用的插件，纯服务端元素不会打包到客户端
import '../elements/code';
import '../elements/code-group';
import '../elements/content';
import '../elements/example';
import '../elements/import';
import '../elements/sandpack';
import '../elements/toc';

const style = css`
  :scope {
    display: grid;
    grid-template-columns: minmax(0, ${theme.maxMainWidth}) 14rem;
    justify-content: center;
    gap: 3rem;
  }
  a,
  gem-link {
    color: inherit;
    text-decoration: none;
  }
  svg {
    width: 1.2em;
    height: 1.2em;
    flex-shrink: 0;
  }
  .toc {
    position: sticky;
    top: calc(${theme.headerHeight} + 2.5rem);
    align-self: start;
    max-height: calc(100vh - ${theme.headerHeight} - 5rem);
    overflow: auto;
    scrollbar-width: thin;
  }
  .old-version {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5rem 1rem;
    margin-bottom: 2rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    border-radius: ${theme.normalRound};
    background: rgb(from ${theme.primaryColor} r g b / 0.1);
    gem-link {
      color: ${theme.primaryColor};
      font-weight: 500;
    }
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 4rem;
    font-size: 0.875rem;
    color: rgb(from ${theme.textColor} r g b / 0.6);
    a:hover {
      color: ${theme.textColor};
    }
  }
  .edit,
  .updated {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .pager {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid ${theme.borderColor};
  }
  .pager-link {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem 2rem;
    line-height: 1.5;
    border-radius: ${theme.normalRound};
    background: rgb(from ${theme.textColor} r g b / 0.05);
    &:hover {
      background: rgb(from ${theme.textColor} r g b / 0.07);
    }
    span {
      transition: transform 0.15s ease;
    }
  }
  .prev:hover .arrow,
  .next:hover .title {
    transform: translateX(-0.25rem);
  }
  .prev:hover .title,
  .next:hover .arrow {
    transform: translateX(0.25rem);
  }
  .next {
    grid-column: 2;
    flex-direction: row-reverse;
    text-align: end;
  }
  /* 首页模式中的首页 */
  :scope:has(.hero, .features) {
    display: block;
    max-width: calc(${theme.sidebarWidth} + ${theme.maxMainWidth});
    margin-inline: auto;
  }
  .hero {
    padding: 4rem 0 5rem;
    text-align: center;
  }
  .hero-title {
    margin: 0;
    font-size: 3.5rem;
    line-height: 1.2;
  }
  .hero-desc {
    max-width: ${theme.maxMainWidth};
    margin: 1.5rem auto 0;
    font-size: 1.4rem;
    text-wrap: balance;
    color: rgb(from ${theme.textColor} r g b / 0.6);
  }
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 1rem 2rem;
    margin-top: 2.5rem;
  }
  .action {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: ${theme.primaryColor};
    &:hover {
      filter: brightness(1.1);
    }
  }
  .primary {
    padding: 0.6rem 2rem;
    border-radius: ${theme.normalRound};
    color: ${theme.backgroundColor};
    background: ${theme.primaryColor};
  }
  .features {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin: 0 0 4rem;
    &[data-columns='4'] {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
  @media (width < 54rem) {
    .features,
    .features[data-columns='4'] {
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    }
  }
  .feature {
    padding: 1.75rem;
    border-radius: ${theme.normalRound};
    background: rgb(from ${theme.textColor} r g b / 0.03);
    dt {
      font-size: 1.1rem;
      font-weight: bold;
    }
    dd {
      margin: 0.75rem 0 0;
      color: rgb(from ${theme.textColor} r g b / 0.6);
    }
  }
  .feature-icon {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    margin-bottom: 1.25rem;
    font-size: 2rem;
    object-fit: contain;
    border-radius: ${theme.normalRound};
    background: rgb(from ${theme.textColor} r g b / 0.03);
  }
  @media not ${`(${mediaQuery.DESKTOP})`} {
    :scope {
      display: block;
    }
    .toc {
      display: none;
    }
  }
  @media ${mediaQuery.PHONE} {
    .pager {
      grid-template-columns: 1fr;
    }
    .next {
      grid-column: auto;
    }
    .hero-title {
      font-size: 2.5rem;
    }
    .hero-desc {
      font-size: 1.2rem;
    }
  }
  @media print {
    .toc,
    .meta,
    .pager {
      display: none;
    }
  }
`;

/** 站内链接使用 `path`，可以添加语言前缀 */
const renderLink = (cls: string, link: string, content: unknown) =>
  link.startsWith('/')
    ? html`<gem-link class=${cls} path=${link}>${content}</gem-link>`
    : html`<gem-link class=${cls} href=${link}>${content}</gem-link>`;

const formatDate = (date: string) =>
  new Intl.DateTimeFormat(i18n.currentLanguage, { dateStyle: 'medium' }).format(new Date(date));

@page<{ 0: string }, Doc>({
  title: ({ data }) => data.title,
  meta: ({ data }) => ({ description: data.description || undefined }),
})
@adoptedStyle(markdownStyle)
@adoptedStyle(style)
export default class DocPage extends GemElement {
  @property data?: Doc;

  // 在渲染文档中的插件前更新
  @memo((i) => [i.data])
  #updateBookStore = () => bookStore({ doc: this.data });

  // 客户端导航到带 hash 的地址时滚动到标题，例如搜索结果
  @effect((i) => [i.data])
  #scrollToHash = () => {
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  };

  // 页面数据加载后标题已经更新
  @effect((i) => [i.data])
  #trackPageView = () => {
    if (__GEM_BOOK_CONFIG__.ga) trackPageView(__GEM_BOOK_CONFIG__.ga);
  };

  #renderHome = ({ hero, features = [] }: Home) => html`
    <section v-if=${!!hero} class="hero">
      <h1 class="hero-title">${hero?.title}</h1>
      <p v-if=${!!hero?.desc} class="hero-desc">${htmlTemplate(hero?.desc || '')}</p>
      <div class="hero-actions">
        ${hero?.actions?.map(({ title, link }, index) =>
          renderLink(index ? 'action' : 'action primary', link, html`${title}${index ? icons.forward : ''}`),
        )}
      </div>
    </section>
    <dl v-if=${!!features.length} class="features" data-columns=${features.length % 4 === 0 ? 4 : 3}>
      ${features.map(
        ({ icon, title, desc }) => html`
          <div class="feature">
            ${
              // 服务端渲染时会输出隐藏的 v-if 分支，图片不能用 v-if，否则会被加载
              !icon
                ? ''
                : [...icon].length <= 3
                  ? html`<span class="feature-icon">${icon}</span>`
                  : html`<img class="feature-icon" src=${icon} alt="" />`
            }
            <dt>${title}</dt>
            <dd>${htmlTemplate(desc)}</dd>
          </div>
        `,
      )}
    </dl>
  `;

  #renderMeta = ({ editUrl, lastUpdated }: Doc) => html`
    <div v-if=${!!editUrl} class="meta">
      <a class="edit" href=${editUrl} target="_blank">
        ${icons.compose} ${i18n.get('editLink', isGitLab() ? 'GitLab' : 'GitHub')}
      </a>
      <span v-if=${!!lastUpdated} class="updated">
        ${i18n.get('lastUpdated')}:
        <a href=${lastUpdated?.url} title=${lastUpdated?.message} target="_blank">
          <time datetime=${lastUpdated?.date}>${lastUpdated && formatDate(lastUpdated.date)}</time>
        </a>
      </span>
    </div>
  `;

  #renderPager = ({ prev, next }: Doc) => html`
    <nav v-if=${!!(prev || next)} class="pager">
      <gem-link v-if=${!!prev} class="pager-link prev" path=${prev?.link} title=${i18n.get('prev')}>
        <span class="arrow">←</span>
        <span class="title">${prev?.title}</span>
      </gem-link>
      <gem-link v-if=${!!next} class="pager-link next" path=${next?.link} title=${i18n.get('next')}>
        <span class="arrow">→</span>
        <span class="title">${next?.title}</span>
      </gem-link>
    </nav>
  `;

  #renderOldVersion = ({ oldVersion }: Doc) => html`
    <div v-if=${!!oldVersion} class="old-version">
      ${i18n.get('oldVersion', oldVersion?.name || '')}
      <gem-link path=${oldVersion?.latest}>${i18n.get('viewLatest')}</gem-link>
    </div>
  `;

  @template()
  #content = () => {
    const doc = this.data!;
    if (doc.home) {
      return html`${this.#renderHome(doc.home)}<article class="markdown">${htmlTemplate(doc.html)}</article>`;
    }
    const headings = doc.headings.filter(({ level }) => level === 2 || level === 3);
    return html`
      <div>
        ${this.#renderOldVersion(doc)}
        <article class="markdown">${htmlTemplate(doc.html)}</article>
        ${this.#renderMeta(doc)} ${this.#renderPager(doc)}
      </div>
      <!-- 没有目录时也占位，内容的宽度保持一致 -->
      <aside class="toc"><gem-book-toc v-if=${!!headings.length} .headings=${headings}></gem-book-toc></aside>
    `;
  };
}
