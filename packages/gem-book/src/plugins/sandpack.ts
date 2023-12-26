import type { RefObject } from '@mantou/gem';
import type { SandpackClient, SandpackBundlerFiles, ClientStatus } from '@codesandbox/sandpack-client';

import type { GemBookElement } from '../element';
import type { Pre } from '../element/elements/pre';

const CSB_URL = 'https://codesandbox.io/api/v1/sandboxes/define?json=1';
const SANDPACK_CLIENT_ESM = 'https://esm.sh/@codesandbox/sandpack-client@2.0?bundle';
const LZ_STRING_ESM = 'https://esm.sh/lz-string@1.5.0';

function throttle<T extends (...args: any) => any>(fn: T, wait = 3000) {
  let timer = 0;
  return (...rest: Parameters<T>) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn(...(rest as any));
      timer = 0;
    }, wait);
  };
}

type FileStatus = 'active' | 'hidden' | '';

type File = {
  element: Pre;
  lang: string;
  filename: string;
  status: FileStatus;
  code: '';
};

type State = {
  files: File[];
  forking: boolean;
  status: ClientStatus | 'initialization' | 'done';
};

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { theme, icons } = GemBookPluginElement;
  const { html, customElement, refobject, attribute, boolattribute, adoptedStyle, css, createCSSSheet, classMap } =
    GemBookPluginElement.Gem;

  const style = createCSSSheet(css`
    :host {
      display: grid;
      grid-template: 'tabs tabs' 'code preview' / 50% 50%;
      border-radius: ${theme.normalRound};
      overflow: hidden;
      margin: 2rem 0px;
    }
    .header {
      grid-area: tabs;
      background: rgba(${theme.textColorRGB}, 0.03);
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
    .actions {
      display: flex;
      gap: 0.5em;
      white-space: nowrap;
    }
    .btn {
      flex-direction: row-reverse;
      cursor: pointer;
      padding: 0.5em;
      gap: 0.3em;
    }
    .btn::part(icon) {
      width: 1em;
    }
    ::slotted(*) {
      display: none;
      max-height: 60vh;
      grid-area: code;
      background: rgba(${theme.textColorRGB}, 0.03);
      margin: 0 !important;
      border-radius: 0 !important;
    }
    .preview {
      display: flex;
      grid-area: preview;
      padding: 1.5em;
      background: rgba(${theme.textColorRGB}, 0.05);
    }
    .status {
      line-height: 2;
      padding: 0.5em;
      text-transform: capitalize;
    }
    .sandbox {
      position: sticky;
      top: calc(${theme.headerHeight} + 1.5em);
      width: 100%;
      min-height: 300px;
      height: 50%;
      border: none;
      background: ${theme.backgroundColor};
      border-radius: ${theme.normalRound};
    }
    @media (max-width: 700px) {
      :host {
        grid-template: 'tabs' 'code' 'preview' / 100%;
      }
      .preview {
        padding: 0;
      }
      .sandbox {
        background: transparent;
      }
      .actions {
        display: none;
      }
    }
  `);

  @customElement('gbp-sandpack')
  @adoptedStyle(style)
  class _GbpSandpackElement extends GemBookPluginElement<State> {
    @refobject iframeRef: RefObject<HTMLIFrameElement>;
    @attribute entry: string;
    @attribute dependencies: string;
    @boolattribute hotreload: boolean;

    get #entry() {
      return this.entry || '.';
    }

    get #defaultEntryFilename() {
      return 'index.ts';
    }

    get #template() {
      const style = getComputedStyle(document.body);
      return `
<style>
  body {
    font: ${style.font};
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
  }
  app-root:not(:defined) {
    display: block;
  }
</style>
<app-root id=root></app-root>
      `.trim();
    }

    get #dependencies() {
      const deps = this.dependencies.split(/\s*,\s*/);
      return deps.reduce(
        (p, c) => {
          if (!c) return p;
          const [name, version = 'latest'] = c.split(/(.+)@/).filter((e) => !!e);
          return { ...p, [name]: version };
        },
        {} as Record<string, string>,
      );
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
      status: 'initialization',
    };

    constructor() {
      super();
      new MutationObserver(async () => {
        const files = this.#parseContents();
        this.setState({ files });
        this.#updateSandbox();
      }).observe(this, {
        childList: true,
        characterData: true,
        subtree: true,
      });

      new IntersectionObserver(async (entries) => {
        const { intersectionRatio } = entries.pop()!;
        if (intersectionRatio > 0 && !this.#sandpackClient) {
          this.#intoViewport();
        }
      }).observe(this);
    }

    #sandpackClient?: Promise<SandpackClient>;

    #parseContents = () => {
      return [...this.querySelectorAll<Pre>('gem-book-pre')].map((element) => {
        element.setAttribute('editable', '');
        return {
          element,
          code: element.textContent,
          filename: element.getAttribute('filename') || this.#defaultEntryFilename,
          lang: element.getAttribute('codelang') || '',
          status: element.getAttribute('status') || '',
        } as File;
      });
    };

    #intoViewport = async () => {
      this.#sandpackClient = this.#initSandpackClient();
      (await this.#sandpackClient).listen((msg) => {
        switch (msg.type) {
          case 'status':
            this.setState({ status: msg.status });
            break;
          case 'done':
            this.setState({ status: 'done' });
            break;
        }
      });
    };

    #initSandpackClient = async () => {
      const { loadSandpackClient } = (await import(
        /* webpackIgnore: true */ SANDPACK_CLIENT_ESM
      )) as typeof import('@codesandbox/sandpack-client');

      return await loadSandpackClient(
        this.iframeRef.element!,
        {
          files: this.state.files.reduce((p, c) => ({ ...p, [c.filename]: { code: c.code } }), {
            'sandbox.config.json': this.#sandBoxConfigFile,
            'index.html': { code: this.#template },
            [this.#defaultEntryFilename]: { code: '' },
          } as SandpackBundlerFiles),
          dependencies: this.#dependencies,
          entry: this.#entry,
        },
        {
          showOpenInCodeSandbox: false,
          showLoadingScreen: false,
        },
      );
    };

    #updateSandbox = throttle(async () => {
      (await this.#sandpackClient)?.updateSandbox({
        files: this.state.files.reduce((p, c) => ({ ...p, [c.filename]: { code: c.code } }), {
          'sandbox.config.json': this.#sandBoxConfigFile,
          'index.html': { code: this.#template },
        } as SandpackBundlerFiles),
        entry: this.#entry,
        dependencies: this.#dependencies,
      });
    });

    #onClickTab = (ele: Pre) => {
      this.setState({
        files: this.state.files.map((file) => {
          const status = file.element === ele ? 'active' : '';
          file.element.status = status;
          return { ...file, status };
        }),
      });
    };

    #onReset = async () => {
      const client = await this.#sandpackClient;
      if (client) {
        this.setState({ status: 'initialization' });
        client.dispatch({ type: 'refresh' });
      }
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
          'index.html': { content: this.#template },
          'package.json': {
            content: {
              main: this.#entry,
              dependencies: this.#dependencies,
            },
          },
        },
      );

      try {
        const parameters = ((await import(/* webpackIgnore: true */ LZ_STRING_ESM)) as any)
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

    unmounted = async () => {
      (await this.#sandpackClient)?.destroy();
    };

    render = () => {
      const { files, forking, status } = this.state;
      if (!files.length) return;
      const currentFile = files.find(({ status }) => status === 'active') || files.find(({ status }) => status === '');

      return html`
        <div class="header">
          <ul class="tabs">
            ${files.map(
              (file) => html`
                <li
                  class=${classMap({ tab: true, current: currentFile?.filename === file.filename })}
                  ?hidden=${file.status === 'hidden'}
                  @click=${() => this.#onClickTab(file.element)}
                >
                  ${file.filename}
                </li>
              `,
            )}
          </ul>
          <div class="actions">
            <gem-use class="btn" @click=${this.#onReset}>Reset</gem-use>
            <gem-use class="btn" .element=${forking ? '' : icons.link} @click=${this.#onFork}>
              Fork ${forking ? '...' : ''}
            </gem-use>
          </div>
        </div>
        <slot></slot>
        <style>
          ::slotted([filename='${currentFile?.filename === this.#defaultEntryFilename ? '' : currentFile?.filename}']) {
            display: block;
          }
        </style>
        <div class="preview">
          <div class="sandbox" ?hidden=${status === 'done'}>
            <span class="status">${status.replace(/_|-/g, ' ')}...</span>
          </div>
          <iframe class="sandbox" ref=${this.iframeRef.ref} ?hidden=${status !== 'done'}></iframe>
        </div>
      `;
    };
  }
});
