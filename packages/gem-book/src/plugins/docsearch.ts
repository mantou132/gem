import type { GemBookElement } from '../element';
import type { MdDocument } from '../bin/plugins';

const moduleLink = 'https://esm.sh/@docsearch/js@3.5.2';
const styleLink = 'https://esm.sh/@docsearch/css@3.5.2/dist/style.css';
const minisearchLink = 'https://esm.sh/minisearch@6.3.0';

const IS_LOCAL = (URL as any).parse(import.meta.url)?.searchParams.has('local');

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

const { GemBookPluginElement } = (await customElements.whenDefined('gem-book')) as typeof GemBookElement;
const { Gem, theme, mediaQuery, config, Utils } = GemBookPluginElement;
const { html, customElement, attribute, createRef, property, css, adoptedStyle, createState, effect, mounted } = Gem;

const styles = css`
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

@customElement('gbp-docsearch')
@adoptedStyle(styles)
class _GbpDocsearchElement extends GemBookPluginElement {
  static defaultLocales: Locales = { zh };

  @attribute appId: string;
  @attribute apiKey: string;
  @attribute indexName: string;

  @property locales?: Locales;

  get #locales(): Locales {
    return { ..._GbpDocsearchElement.defaultLocales, ...this.locales };
  }

  #searchRef = createRef<HTMLInputElement>();
  #state = createState({ style: '' });

  render() {
    return html`
      <style>
        ${this.#state.style}
      </style>
      <style>
        :root {
          --docsearch-logo-color: ${theme.primaryColor};
          --docsearch-primary-color: ${theme.primaryColor};
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
          outline-color: ${theme.primaryColor};
        }
        .DocSearch-Container a {
          color: ${theme.primaryColor};
        }
        .DocSearch-Commands-Key {
          padding: 0;
          width: 1em;
        }
      </style>
      <div ${this.#searchRef}></div>
    `;
  }

  #navigator = (url: string) => {
    // route 中会更新 title
    history.pushState(null, document.title, url.replace(new RegExp(`/${GemBookPluginElement.lang}(/?)`), '$1'));
  };

  #miniSearch?: Promise<any>;

  #search = Utils.debounce(async (query: string): Promise<Res> => {
    const miniSearch = await this.#miniSearch;
    const result: IndexObject[] = miniSearch?.search(query, { fuzzy: 0.2 }) || [];
    if (result.length > 20) result.length = 20;
    return getRes(query, result);
  }, 500);

  @effect(() => [GemBookPluginElement.lang])
  #initLocalSearch = async () => {
    if (!IS_LOCAL) return;
    const [{ default: MiniSearch }, res] = await Promise.all([
      import(/* webpackIgnore: true */ minisearchLink) as any,
      fetch(
        `/${['documents', GemBookPluginElement.lang, 'json'].filter((e) => !!e).join('.')}?version=${config.version}`,
      ),
    ]);
    const segmenter = Intl.Segmenter && new Intl.Segmenter(GemBookPluginElement.lang, { granularity: 'word' });

    const documents: MdDocument[] = await res.json();
    // https://github.com/lucaong/minisearch/
    const miniSearch = new MiniSearch({
      fields: ['title', 'content'],
      storeFields: ['title', 'content', 'titles', 'type'],
      processTerm: (term: string) => {
        if (!segmenter) return term;
        const tokens: string[] = [];
        for (const seg of segmenter.segment(term)) {
          tokens.push(seg.segment);
        }
        return tokens;
      },
    });

    const record = Object.fromEntries(documents.map((document) => [document.id, document.title]));
    documents.forEach(async (document) => {
      if (!document.text) return;
      await new Promise((resolve) => (window.requestIdleCallback || setTimeout)(resolve));

      const df = new DocumentFragment();
      df.append(...Utils.parseMarkdown(document.text));
      const titleList = [record[document.id]];
      const parts = document.id.split('/');
      while (parts.length) {
        const part = parts.pop();
        if (!part) continue;
        const parentId = parts.join('/');
        const parent = record[parentId + '/'];
        if (!parent) continue;
        titleList.unshift(parent);
      }

      getSections(df, titleList).forEach(({ hash, content, titles }) => {
        if (titles.length < 2) titles.unshift(config.title || 'Documentation');

        miniSearch.add({
          id: document.id + hash,
          title: titles.at(-1),
          content: Utils.escapeHTML(content),
          titles: titles.map((title, index) => Utils.capitalize(index === 0 ? title : Utils.escapeHTML(title))),
          type: hash ? 'content' : `lvl${titles.length - 1}`,
        } as IndexObject);
      });
    });
    this.#miniSearch = miniSearch;
  };

  @effect((i) => [GemBookPluginElement.lang, i.appId, i.apiKey, i.indexName])
  #initDocsearch = async () => {
    const [text, { default: docSearch }] = await Promise.all([
      (await fetch(styleLink)).text(),
      await import(/* webpackIgnore: true */ moduleLink),
    ]);
    this.#state({ style: text });
    // https://docsearch.algolia.com/docs/api
    const locale = this.#locales[GemBookPluginElement.lang || ''];
    docSearch({
      appId: this.appId || undefined,
      apiKey: this.apiKey,
      indexName: this.indexName,
      container: this.#searchRef.value,
      searchParameters: {
        facetFilters: GemBookPluginElement.lang ? [`lang:${GemBookPluginElement.lang}`] : [],
      },
      placeholder: locale?.placeholder,
      translations: locale?.translations,
      // keyboard navigation
      navigator: {
        navigate: (item: { itemUrl: string }) => {
          this.#navigator(new URL(item.itemUrl, location.origin).href);
        },
      },
      getMissingResultsUrl: config.github
        ? ({ query }: { query: string }) => {
            if (Utils.isGitLab()) {
              return `${config.github}/-/issues/new?issue[title]=${query}`;
            }
            return `${config.github}/issues/new?title=${query}`;
          }
        : undefined,
      transformSearchClient: (searchClient: any) => {
        return {
          ...searchClient,
          // https://github.com/algolia/docsearch/blob/874e16a5d42e8657e6ab2653e9638cd2282ba408/packages/docsearch-react/src/DocSearchModal.tsx#L227C36-L227C36
          search: async ([queryObject]: any) => {
            if (IS_LOCAL) return this.#search(queryObject.query);
            return searchClient.search([queryObject]);
          },
        };
      },
    });
  };

  #onClick = (evt: Event) => {
    const target = evt.target as Element;
    if (!target.closest('.DocSearch')) return;
    const link = target.closest('a');
    if (
      !link ||
      link.target === '_blank' ||
      (link.origin !== location.origin && !location.origin.includes('localhost'))
    )
      return;
    evt.preventDefault();
    this.#navigator(link.href);
  };

  // https://github.com/algolia/docsearch/pull/2212
  #keyDown = (event: KeyboardEvent) => {
    const element = event.composedPath()[0] as HTMLElement;
    const tagName = element.tagName;
    if (element.isContentEditable || tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA') {
      event.stopPropagation();
    }
  };

  @mounted()
  #init = () => {
    const controller = new AbortController();
    addEventListener('click', this.#onClick, { signal: controller.signal });
    addEventListener('keydown', this.#keyDown, { signal: controller.signal, capture: true });
    return () => controller.abort();
  };
}

type IndexObject = {
  id: string;
  title: string;
  content: string;
  titles: string[];
  type: ContentType;
};

type Section = {
  hash: string;
  content: string;
  titles: string[];
};

function getSections(df: DocumentFragment, titles: string[]) {
  const result: Section[] = [];
  [...df.children].forEach((ele) => {
    if (ele.tagName === 'H1') {
      return result.push({
        hash: '',
        titles,
        content: '',
      });
    }
    if (ele.tagName === 'H2') {
      return result.push({
        hash: `#${encodeURIComponent(ele.id)}`,
        titles: [...titles, ele.textContent!],
        content: '',
      });
    }
    const last = result.at(-1);
    if (last) {
      last.content += ele.textContent || '';
    }
  });
  return result;
}

function getHit(query: string, { id, titles, type, content }: IndexObject): DocSearchHit {
  const start = content.indexOf(query);
  const prefix = content.slice(0, start);
  const forward = prefix.length - prefix.lastIndexOf('\n');
  const snippet = content.slice(Math.max(start - forward, 0));
  return {
    objectID: id,
    url: id,
    content,
    type,
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

function getRes(query: string, result: IndexObject[]): Res {
  const record: Record<string, number> = {};
  const sortedResult: IndexObject[][] = result.map((obj, index) => {
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
