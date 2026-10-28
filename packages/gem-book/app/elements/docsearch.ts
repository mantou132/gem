import { adoptedStyle, createRef, css, customElement, GemElement, history, html, mounted, template } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { i18n } from '$gemkit/i18n';
import { isGitLab } from '../lib/site';
import { primaryTextColor, theme } from '../lib/theme';
import type { SearchItem } from '../lib/types';

const moduleLink = 'https://esm.sh/@docsearch/js@3.5.2';
const styleLink = 'https://esm.sh/@docsearch/css@3.5.2/dist/style.css';
const minisearchLink = 'https://esm.sh/minisearch@6.3.0';

const { docsearch, github } = __GEM_BOOK_CONFIG__;

// https://vitepress.dev/zh/reference/default-theme-search#algolia-search-i18n
const zh = {
  placeholder: '搜索文档',
  translations: {
    button: {
      buttonText: '搜索文档',
      buttonAriaLabel: '搜索文档',
    },
    modal: {
      searchBox: {
        resetButtonTitle: '清除查询条件',
        resetButtonAriaLabel: '清除查询条件',
        cancelButtonText: '取消',
        cancelButtonAriaLabel: '取消',
      },
      startScreen: {
        recentSearchesTitle: '搜索历史',
        noRecentSearchesText: '没有搜索历史',
        saveRecentSearchButtonTitle: '保存至搜索历史',
        removeRecentSearchButtonTitle: '从搜索历史中移除',
        favoriteSearchesTitle: '收藏',
        removeFavoriteSearchButtonTitle: '从收藏中移除',
      },
      errorScreen: {
        titleText: '无法获取结果',
        helpText: '你可能需要检查你的网络连接',
      },
      footer: {
        selectText: '选择',
        navigateText: '切换',
        closeText: '关闭',
        searchByText: '搜索提供者',
      },
      noResultsScreen: {
        noResultsText: '无法找到相关结果',
        suggestedQueryText: '你可以尝试查询',
        reportMissingResultsText: '你认为该查询应该有结果？',
        reportMissingResultsLinkText: '点击反馈',
      },
    },
  },
};

type Locales = Record<string, typeof zh | undefined>;

const locales: Locales = { zh };

const style = css`
  :scope {
    display: block;
  }
  .DocSearch-Button,
  .DocSearch-Button:hover,
  .DocSearch-Button .DocSearch-Search-Icon {
    color: rgb(from ${theme.textColor} r g b / 0.5);
  }
  .DocSearch-Button,
  .DocSearch-Button:hover {
    background: rgb(from ${theme.textColor} r g b / 0.05);
  }
  .DocSearch-Button .DocSearch-Search-Icon {
    width: 1.2em;
    margin-inline: 0.35em;
  }
  .DocSearch-Button {
    width: 100%;
    margin: 0;
    border-radius: ${theme.normalRound};
    font-weight: normal;
  }
  .DocSearch-Button-Keys {
    justify-content: center;
    border-radius: ${theme.smallRound};
    border: 1px solid ${theme.borderColor};
    min-width: auto;
    padding-inline: 0.3em;
  }
  .DocSearch-Button-Key {
    position: static;
    margin: 0;
    padding: 0;
    width: 1em;
    font-family: ${theme.codeFont};
  }
  @media ${mediaQuery.PHONE} {
    .DocSearch-Button,
    .DocSearch-Button:hover,
    .DocSearch-Button .DocSearch-Search-Icon {
      padding: 0;
      background: transparent;
    }
    .DocSearch-Button .DocSearch-Search-Icon {
      width: 1.5rem;
      margin-inline: 0;
    }
  }
`;

/** 主题变量，搜索框在 `<body>` 中，需要全局样式 */
const globalStyle = `
  :root {
    --docsearch-logo-color: ${theme.primaryColor};
    --docsearch-primary-color: ${primaryTextColor};
    --docsearch-text-color: ${theme.textColor};
    --docsearch-muted-color: rgb(from ${theme.textColor} r g b / 0.6);
    --docsearch-container-background: rgba(101, 108, 133, 0.8);
    --docsearch-modal-background: ${theme.backgroundColor};
    --docsearch-modal-shadow: 0 3px 8px 0 #555a64;
    --docsearch-searchbox-background: rgb(from ${theme.textColor} r g b / 0.05);
    --docsearch-searchbox-focus-background: rgb(from ${theme.textColor} r g b / 0.05);
    --docsearch-hit-color: rgb(from ${theme.textColor} r g b / 0.6);
    --docsearch-hit-background: rgb(from ${theme.textColor} r g b / 0.05);
    --docsearch-hit-active-color: #fff;
    --docsearch-hit-shadow: none;
    --docsearch-footer-background: ${theme.backgroundColor};
    --docsearch-footer-shadow: 0 -1px 0 0 ${theme.borderColor};
    --docsearch-key-gradient: transparent;
    --docsearch-key-shadow: none;
  }
  .DocSearch {
    color: ${theme.textColor};
    font-family: ${theme.font};
  }
  .DocSearch-Container * {
    outline-offset: -2px;
    outline-color: ${primaryTextColor};
  }
  .DocSearch-Container a {
    color: ${primaryTextColor};
  }
  .DocSearch-Commands-Key {
    padding: 0;
    width: 1em;
  }
`;

/** 本地搜索的索引，由 `search-index` 页面的数据文件提供 */
const fetchSearchIndex = async (): Promise<SearchItem[]> => {
  const res = await fetch(`${history.basePath}/search-index/__data.json`);
  const { data } = await res.json();
  return data['gemkit-page-search-index'];
};

/**
 * 使用 Algolia DocSearch 搜索文档，配置为 `local` 时使用本地搜索（MiniSearch）
 */
@customElement('gbp-docsearch')
@adoptedStyle(style)
export class GbpDocsearchElement extends GemElement {
  #searchRef = createRef<HTMLDivElement>();

  #miniSearch?: Promise<any>;

  /** 站内链接客户端导航，链接包含语言前缀 */
  #navigate = (url: string) => {
    const { pathname, search, hash } = new URL(url, location.href);
    history.push({ path: pathname.slice(history.basePath.length) || '/', query: search, hash });
  };

  #timer = 0;

  #search = (query: string) =>
    new Promise<Res>((resolve) => {
      clearTimeout(this.#timer);
      this.#timer = window.setTimeout(async () => {
        const result: SearchItem[] = (await this.#miniSearch)?.search(query, { fuzzy: 0.2 }) || [];
        resolve(getRes(query, result.slice(0, 20)));
      }, 300);
    });

  #initLocalSearch = async () => {
    const [{ default: MiniSearch }, items] = await Promise.all([
      import(/* webpackIgnore: true */ minisearchLink),
      fetchSearchIndex(),
    ]);
    // 中文等没有空格的语言需要分词
    const segmenter = new Intl.Segmenter(i18n.currentLanguage, { granularity: 'word' });
    const miniSearch = new MiniSearch({
      fields: ['title', 'content'],
      storeFields: ['content', 'titles', 'type'],
      processTerm: (term: string) => [...segmenter.segment(term)].map(({ segment }) => segment),
    });
    miniSearch.addAll(items.map((item) => ({ ...item, title: item.titles.at(-1) })));
    return miniSearch;
  };

  @mounted()
  #init = async () => {
    if (docsearch === 'local') this.#miniSearch = this.#initLocalSearch();
    const { default: docSearch } = await import(/* webpackIgnore: true */ moduleLink);
    const locale = locales[i18n.currentLanguage];
    const { appId, apiKey = '', indexName = '' } = typeof docsearch === 'object' ? docsearch : {};
    // https://docsearch.algolia.com/docs/api
    docSearch({
      appId: appId || 'local',
      apiKey: apiKey || 'local',
      indexName: indexName || 'local',
      container: this.#searchRef.value,
      searchParameters: { facetFilters: [`lang:${i18n.currentLanguage}`] },
      placeholder: locale?.placeholder,
      translations: locale?.translations,
      navigator: { navigate: ({ itemUrl }: { itemUrl: string }) => this.#navigate(itemUrl) },
      getMissingResultsUrl: github
        ? ({ query }: { query: string }) =>
            isGitLab() ? `${github}/-/issues/new?issue[title]=${query}` : `${github}/issues/new?title=${query}`
        : undefined,
      transformSearchClient: (searchClient: any) => ({
        ...searchClient,
        search: async ([queryObject]: any) =>
          docsearch === 'local' ? this.#search(queryObject.query) : searchClient.search([queryObject]),
      }),
    });
  };

  // 搜索结果中的站内链接使用客户端导航
  #onClick = (evt: Event) => {
    const target = evt.target as Element;
    const link = target.closest?.('.DocSearch a') as HTMLAnchorElement | null;
    if (!link || link.target === '_blank' || link.origin !== location.origin) return;
    evt.preventDefault();
    this.#navigate(link.href);
  };

  // 在输入框中输入时不打开搜索 https://github.com/algolia/docsearch/pull/2212
  #onKeyDown = (event: KeyboardEvent) => {
    const element = event.composedPath()[0] as HTMLElement;
    if (element.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
      event.stopPropagation();
    }
  };

  @mounted()
  #listen = () => {
    const controller = new AbortController();
    addEventListener('click', this.#onClick, { signal: controller.signal });
    addEventListener('keydown', this.#onKeyDown, { signal: controller.signal, capture: true });
    return () => controller.abort();
  };

  @template()
  #content = () => html`
    <link rel="stylesheet" href=${styleLink} />
    <style>
      ${globalStyle}
    </style>
    <div ${this.#searchRef}></div>
  `;
}

function getHit(query: string, { id, titles, type, content }: SearchItem): DocSearchHit {
  const start = content.indexOf(query);
  const prefix = content.slice(0, start);
  const forward = prefix.length - prefix.lastIndexOf('\n');
  const snippet = content.slice(Math.max(start - forward, 0));
  return {
    objectID: id,
    url: id,
    content,
    type: type as ContentType,
    hierarchy: Object.fromEntries(titles.map((title, index) => [`lvl${index}`, title])) as DocSearchHit['hierarchy'],
    _snippetResult: content
      ? {
          content: {
            value: snippet.replaceAll(query, `<mark>${query}</mark>`),
            matchLevel: 'full',
          },
        }
      : undefined,
  };
}

function getRes(query: string, result: SearchItem[]): Res {
  const record: Record<string, number> = {};
  const sortedResult: SearchItem[][] = result.map((obj, index) => {
    record[obj.id] = index;
    if (obj.type !== 'content') {
      return [obj];
    }
    return [];
  });
  result.forEach((obj, index) => {
    if (obj.type === 'content') {
      const parentIndex = record[obj.id.split('#').shift()!];
      if (parentIndex !== undefined) {
        sortedResult[parentIndex].push(obj);
      } else {
        sortedResult[index].push(obj);
      }
    }
  });
  return {
    results: [
      {
        hits: sortedResult.flat().map((index) => getHit(query, index)),
        nbHits: 1,
        page: 0,
        nbPages: 1,
        hitsPerPage: result.length,
        processingTimeMS: 0,
        exhaustiveNbHits: true,
        params: '',
        query,
      },
    ],
  };
}

// https://github.com/algolia/docsearch/blob/874e16a5d42e8657e6ab2653e9638cd2282ba408/packages/docsearch-react/src/__tests__/api.test.tsx#L15
type Result = {
  hits: DocSearchHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  exhaustiveNbHits: boolean;
  params: string;
  query: string;
} & Record<string, any>;

type Res = { results: Result[] };

// https://github.com/algolia/docsearch/blob/874e16a5d42e8657e6ab2653e9638cd2282ba408/packages/docsearch-react/src/types/DocSearchHit.ts#L45
type ContentType = 'content' | 'lvl0' | 'lvl1' | 'lvl2' | 'lvl3' | 'lvl4' | 'lvl5' | 'lvl6';

interface DocSearchHitAttributeHighlightResult {
  value: string;
  matchLevel: 'full' | 'none' | 'partial';
  matchedWords?: string[];
  fullyHighlighted?: boolean;
}

interface DocSearchHitHighlightResultHierarchy {
  lvl0: DocSearchHitAttributeHighlightResult;
  lvl1: DocSearchHitAttributeHighlightResult;
  lvl2: DocSearchHitAttributeHighlightResult;
  lvl3: DocSearchHitAttributeHighlightResult;
  lvl4: DocSearchHitAttributeHighlightResult;
  lvl5: DocSearchHitAttributeHighlightResult;
  lvl6: DocSearchHitAttributeHighlightResult;
}

interface DocSearchHitAttributeSnippetResult {
  value: string;
  matchLevel: 'full' | 'none' | 'partial';
}

interface DocSearchHitSnippetResult {
  content: DocSearchHitAttributeSnippetResult;
  hierarchy?: DocSearchHitHighlightResultHierarchy;
  hierarchy_camel?: DocSearchHitHighlightResultHierarchy[];
}

export declare type DocSearchHit = {
  objectID: string;
  content: string | null;
  url: string;
  type: ContentType;
  hierarchy: {
    lvl0: string;
    lvl1: string;
    lvl2: string | null;
    lvl3: string | null;
    lvl4: string | null;
    lvl5: string | null;
    lvl6: string | null;
  };
  _snippetResult?: DocSearchHitSnippetResult;
};
