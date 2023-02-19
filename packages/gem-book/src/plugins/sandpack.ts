import type { RefObject } from '@mantou/gem';
import type { SandpackClient, SandpackBundlerFiles } from '@codesandbox/sandpack-client';

import type { GemBookElement } from '../element';
import type { Pre } from '../element/elements/pre';

const CSB_URL = 'https://codesandbox.io/api/v1/sandboxes/define?json=1';
const sandpackClientSrc = 'https://esm.sh/@codesandbox/sandpack-client?bundle';
const lzStringSrc = 'https://esm.sh/lz-string';

type FileStatus = 'active' | 'hidden' | '';

type File = {
  lang: string;
  filename: string;
  status: FileStatus;
  code: '';
};

type State = {
  files: File[];
  forking: boolean;
};

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { theme, iconsContainer } = GemBookPluginElement;
  const { html, customElement, refobject, attribute, boolattribute, adoptedStyle, css, createCSSSheet, classMap } =
    GemBookPluginElement.Gem;

  const style = createCSSSheet(css`
    :host {
      display: grid;
      grid-template: 'tabs tabs' 'code preview' / 50% 50%;
    }
    @media (max-width: 700px) {
      :host {
        grid-template: 'tabs' 'code' 'preview' / 100%;
        margin-inline: -1em;
      }
    }
    .header {
      grid-area: tabs;
      background: rgba(${theme.textColorRGB}, 0.05);
      border-bottom: 1px solid ${theme.borderColor};
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header[hidden] {
      display: none;
    }
    .tabs {
      display: flex;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .tab {
      padding: 0.5em 1em;
      cursor: pointer;
      border-top: 2px solid transparent;
      border-bottom: 2px solid transparent;
    }
    .current {
      color: ${theme.primaryColor};
      border-bottom-color: currentColor;
    }
    .btn {
      cursor: pointer;
      padding: 0.5em;
      white-space: nowrap;
      flex-direction: row-reverse;
      gap: 0.3em;
    }
    ::slotted(*) {
      display: none;
      grid-area: code;
      margin: 0 !important;
    }
    .preview {
      grid-area: preview;
      padding: 1.5em;
      background: ${theme.borderColor};
    }
    iframe {
      position: sticky;
      top: calc(${theme.headerHeight} + 1.5em);
      width: 100%;
      min-height: 300px;
      height: 50%;
      border: none;
      background: ${theme.backgroundColor};
    }
  `);

  @customElement('gbp-sandpack')
  @adoptedStyle(style)
  class _GbpSandpackElement extends GemBookPluginElement<State> {
    @refobject iframeRef: RefObject<HTMLIFrameElement>;
    @attribute entry: string;
    @boolattribute hotreload: boolean;

    get #entry() {
      return this.entry || '.';
    }

    get #sandBoxConfigFile() {
      return {
        code: JSON.stringify({
          hardReloadOnChange: !this.hotreload,
          infiniteLoopProtection: true,
          view: 'browser',
        }),
      };
    }

    state: State = {
      files: [],
      forking: false,
    };

    constructor() {
      super();
      new MutationObserver(() => {
        const files = this.#parseContents();
        this.setState({ files });
        this.#sandpackClient?.updateSandbox({
          files: {
            'sandbox.config.json': this.#sandBoxConfigFile,
            ...files.reduce((p, c) => ({ ...p, [c.filename]: { code: c.code } }), {} as SandpackBundlerFiles),
          },
          entry: this.#entry,
        });
      }).observe(this, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    #defaultEntryFilename = 'index.ts';

    #sandpackClient?: SandpackClient;

    #parseContents = () => {
      return [...this.querySelectorAll<Pre>('gem-book-pre')].map(
        (e) =>
          ({
            code: e.textContent,
            filename: e.getAttribute('filename') || this.#defaultEntryFilename,
            lang: e.getAttribute('codelang'),
            status: e.hidden ? 'hidden' : 'active',
          } as File),
      );
    };

    #init = async () => {
      const { loadSandpackClient } = (await import(
        /* webpackIgnore: true */ sandpackClientSrc
      )) as typeof import('@codesandbox/sandpack-client');

      this.#sandpackClient = await loadSandpackClient(
        this.iframeRef.element!,
        {
          files: {
            'sandbox.config.json': this.#sandBoxConfigFile,
            [this.#defaultEntryFilename]: { code: '' },
            ...this.state.files.reduce(
              (p, c) => ({ ...p, [c.filename]: { code: c.code } }),
              {} as SandpackBundlerFiles,
            ),
          },
          dependencies: {},
          entry: this.#entry,
        },
        {
          showOpenInCodeSandbox: false,
          showLoadingScreen: false,
        },
      );
    };

    #onClickTab = (filename: string) => {
      this.setState({
        files: this.state.files.map((e) => ({
          ...e,
          status: e.filename === filename ? 'active' : e.status === 'hidden' ? 'hidden' : '',
        })),
      });
    };

    #onFork = async () => {
      if (this.state.forking) return;
      this.setState({ forking: true });
      // https://codesandbox.io/docs/learn/getting-started/your-first-sandbox#xhr-request
      const normalizedFiles = this.state.files.reduce(
        (p, c) => ({
          ...p,
          [c.filename.replace('/', '')]: { content: c.code },
        }),
        {
          'sandbox.config.json': { content: this.#sandBoxConfigFile.code },
        },
      );

      try {
        const parameters = ((await import(/* webpackIgnore: true */ lzStringSrc)) as any)
          .compressToBase64(JSON.stringify({ files: normalizedFiles }))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const res = await fetch(CSB_URL, {
          body: new URLSearchParams({ parameters }).toString(),
          method: 'post',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        const { sandbox_id } = await res.json();

        open(`https://codesandbox.io/s/${sandbox_id}`);
      } finally {
        this.setState({ forking: false });
      }
    };

    willMount = () => {
      this.setState({ files: this.#parseContents() });
    };

    mounted = () => {
      this.#init();
      return () => {
        this.#sandpackClient?.destroy();
      };
    };

    render = () => {
      const { files, forking } = this.state;
      const currentFile = files.find(({ status }) => status === 'active');

      return html`
        <div class="header" ?hidden=${files.length < 2}>
          <ul class="tabs">
            ${files.map(
              ({ filename, status }) =>
                html`
                  <li
                    class=${classMap({ tab: true, current: currentFile?.filename === filename })}
                    ?hidden=${status === 'hidden'}
                    @click=${() => this.#onClickTab(filename)}
                  >
                    ${filename}
                  </li>
                `,
            )}
          </ul>
          <gem-use .root=${iconsContainer} selector="#link" class="btn" @click=${this.#onFork}>
            Fork ${forking ? '...' : ''}
          </gem-use>
        </div>
        <slot></slot>
        <style>
          ::slotted([filename='${currentFile?.filename === this.#defaultEntryFilename ? '' : currentFile?.filename}']) {
            display: block;
          }
        </style>
        <div class="preview">
          <iframe ref=${this.iframeRef.ref}></iframe>
        </div>
      `;
    };
  }
});
