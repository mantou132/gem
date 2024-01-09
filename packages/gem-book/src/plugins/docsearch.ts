import type { RefObject } from '@mantou/gem';

import type { GemBookElement } from '../element';

const moduleLink = 'https://esm.sh/@docsearch/js@3.5.2';
const styleLink = 'https://esm.sh/@docsearch/css@3.5.2/dist/style.css';

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

customElements.whenDefined('gem-book').then(({ GemBookPluginElement }: typeof GemBookElement) => {
  const { Gem, theme, mediaQuery } = GemBookPluginElement;
  const { html, customElement, attribute, refobject, addListener, property } = Gem;

  @customElement('gbp-docsearch')
  class _GbpDocsearchElement extends GemBookPluginElement {
    static defaultLocales: Locales = { zh };

    @attribute appId: string;
    @attribute apiKey: string;
    @attribute indexName: string;
    @refobject searchRef: RefObject<HTMLInputElement>;

    @property locales?: Locales;

    get #locales(): Locales {
      return { ..._GbpDocsearchElement.defaultLocales, ...this.locales };
    }

    state = {
      style: '',
    };

    render() {
      return html`
        <gem-reflect>
          <style>
            ${this.state.style}
          </style>
          <style>
            :root {
              --docsearch-logo-color: ${theme.primaryColor};
              --docsearch-primary-color: ${theme.primaryColor};
              --docsearch-text-color: ${theme.textColorRGB};
              --docsearch-muted-color: rgba(${theme.textColorRGB}, 0.6);
              --docsearch-container-background: rgba(101, 108, 133, 0.8);
              --docsearch-modal-background: ${theme.backgroundColor};
              --docsearch-modal-shadow: 0 3px 8px 0 #555a64;
              --docsearch-searchbox-background: rgba(${theme.textColorRGB}, 0.05);
              --docsearch-searchbox-focus-background: rgba(${theme.textColorRGB}, 0.05);
              --docsearch-hit-color: rgba(${theme.textColorRGB}, 0.6);
              --docsearch-hit-background: rgba(${theme.textColorRGB}, 0.05);
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
            .DocSearch-Commands-Key {
              padding: 0;
              width: 1em;
            }
          </style>
        </gem-reflect>
        <style>
          ${this.state.style}
        </style>
        <style>
          :host {
            display: block;
          }
          .DocSearch-Button,
          .DocSearch-Button:hover,
          .DocSearch-Button .DocSearch-Search-Icon {
            color: rgba(${theme.textColorRGB}, 0.5);
          }
          .DocSearch-Button,
          .DocSearch-Button:hover {
            background: rgba(${theme.textColorRGB}, 0.05);
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
        </style>
        <div ref=${this.searchRef.ref}></div>
      `;
    }

    #navigator = (url: string) => {
      history.pushState(null, '', url.replace(new RegExp(`/${GemBookPluginElement.lang}(/?)`), '$1'));
    };

    mounted = () => {
      this.effect(
        async () => {
          const [text, { default: docSearch }] = await Promise.all([
            (await fetch(styleLink)).text(),
            await import(/* webpackIgnore: true */ moduleLink),
          ]);
          this.setState({ style: text });
          // https://docsearch.algolia.com/docs/api
          const locale = this.#locales[GemBookPluginElement.lang || ''];
          docSearch({
            appId: this.appId || undefined,
            apiKey: this.apiKey,
            indexName: this.indexName,
            container: this.searchRef.element,
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
          });
        },
        () => [GemBookPluginElement.lang, this.appId, this.apiKey, this.indexName],
      );

      return addListener(window, 'click', (evt) => {
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
      });
    };
  }
});
