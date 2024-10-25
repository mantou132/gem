import type {
  SandpackClient,
  SandpackBundlerFiles,
  ClientStatus,
  SandpackTemplate,
  SandboxSetup,
  ClientOptions,
  SandpackMessage,
} from '@codesandbox/sandpack-client';

import type { GemBookElement } from '../element';
import type { Pre } from '../element/elements/pre';

const ESBUILD_URL = 'https://esm.sh/esbuild-wasm@0.24.0';
const CSB_URL = 'https://codesandbox.io/api/v1/sandboxes/define?json=1';
const SANDPACK_CLIENT_ESM = 'https://esm.sh/@codesandbox/sandpack-client@2.18.2?bundle';
const LZ_STRING_ESM = 'https://esm.sh/lz-string@1.5.0';

const loadEventName = '_load_';

const { promise, resolve } = Promise.withResolvers<typeof import('esbuild')>();
let initialize = false;
async function loadESBuild() {
  if (initialize) return promise;
  initialize = true;
  const esbuild = (await import(/* webpackIgnore: true */ ESBUILD_URL)) as typeof import('esbuild');
  await esbuild.initialize({ wasmURL: `${ESBUILD_URL}/esbuild.wasm`, worker: true });
  resolve(esbuild);
  return promise;
}

declare global {
  interface Uint8Array {
    toBase64: (options: any) => any;
  }
}

// https://github.com/tc39/proposal-arraybuffer-base64
Uint8Array.prototype.toBase64 = async function (this: Uint8Array) {
  const url = 'https://esm.sh/duoyun-ui/lib/encode';
  const { arrayBufferToBase64 } = await import(/* webpackIgnore: true */ url);
  return arrayBufferToBase64(this.buffer, true);
};

async function compressStringToBase64(str: string) {
  const cs = new CompressionStream('gzip');
  const stream = new Blob([str]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer()).toBase64({ alphabet: 'base64url' });
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

const { GemBookPluginElement } = (await customElements.whenDefined('gem-book')) as typeof GemBookElement;
const { theme, icons, Utils } = GemBookPluginElement;
const {
  html,
  customElement,
  createRef,
  attribute,
  boolattribute,
  adoptedStyle,
  createCSSSheet,
  classMap,
  shadow,
  createState,
  willMount,
  mounted,
} = GemBookPluginElement.Gem;

const styles = createCSSSheet`
  :host {
    display: block;
    container-type: inline-size;
    margin: 2rem 0px;
  }
  .container {
    display: grid;
    grid-template: 'tabs tabs' 'code preview' / 50% 50%;
    border-radius: ${theme.normalRound};
    overflow: hidden;
  }
  .header {
    grid-area: tabs;
    background: rgb(from ${theme.textColor} r g b / 0.03);
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
    padding: 0 0 0 1em;
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
    max-height: 70vh;
    grid-area: code;
    background: rgb(from ${theme.textColor} r g b / 0.03);
    margin: 0 !important;
    border-radius: 0 !important;
  }
  .preview {
    display: flex;
    grid-area: preview;
    padding: 1.5em;
    background: rgb(from ${theme.textColor} r g b / 0.05);
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
    color-scheme: light;
  }
  .sandbox.loading {
    /* Safari not load hidden iframe */
    position: absolute;
    width: 1px;
    opacity: 0;
  }
  @container (max-width: 700px) {
    .container {
      grid-template: 'tabs' 'code' 'preview' / 100%;
    }
    .preview {
      padding: 0;
      border-top: 1px solid ${theme.borderColor};
    }
    .sandbox {
      min-height: auto;
      height: 35vh;
      background: transparent;
    }
    .actions {
      display: none;
    }
    ::slotted(*) {
      height: 35vh;
    }
  }
`;

@customElement('gbp-sandpack')
@adoptedStyle(styles)
@shadow()
class _GbpSandpackElement extends GemBookPluginElement {
  @attribute entry: string;
  @attribute dependencies: string;
  @attribute template: SandpackTemplate;
  @boolattribute hotreload: boolean;

  get #template() {
    return this.template || undefined;
  }

  get #entry() {
    return this.entry || '.';
  }

  get #defaultEntryFilename() {
    return 'index.ts';
  }

  get #indexTemplate() {
    const style = getComputedStyle(document.body);
    return `
      <!DOCTYPE html>
      <style>
        body {
          font: ${style.font};
          -moz-osx-font-smoothing: grayscale;
          -webkit-font-smoothing: antialiased;
        }
        app-root:not(:defined) {
          display: contents;
        }
      </style>
      <app-root id=root></app-root>
    `.trim();
  }

  get #useESMBuild() {
    return !this.#template;
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

  #iframeRef = createRef<HTMLIFrameElement>();

  #state = createState<State>({
    files: [],
    forking: false,
    status: 'initialization',
  });

  #sandpackClient?: Promise<SandpackClient>;

  #parseContents = () => {
    return [...this.querySelectorAll<Pre>('gem-book-pre')].map((element) => {
      const filename = (element.getAttribute('filename') || this.#defaultEntryFilename).toLowerCase();
      element.dataset.filename = filename;
      element.setAttribute('headless', '');
      element.setAttribute('editable', '');
      element.setAttribute('linenumber', '');
      return {
        element,
        filename,
        code: element.textContent,
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
          this.#state({ status: msg.status });
          break;
        case 'done':
          this.#state({ status: 'done' });
          break;
      }
    });
  };

  // `false`: 只有发生错误或者 console.error 才显示
  #getErudaResources(always?: boolean) {
    const erudaInit = `data:application/javascript;base64,${btoa(
      `
        const root = document.createElement('div');
        document.body.append(root);
        eruda.init({ container: root, tool: ['console'] });
        const style = new CSSStyleSheet();
        style.replace(\`
          .eruda-dev-tools, .eruda-console { top: 0; border: none; padding: 0 !important; height: 100% !important; }
          .eruda-resizer, .eruda-tab, .eruda-entry-btn, .eruda-control, .eruda-js-input { display: none !important; }
        \`);
        root.shadowRoot.adoptedStyleSheets.push(style);
        if (${!!always}) eruda.show();
        const onError = () => {
          eruda.show();
          parent.postMessage('${loadEventName}', '*');
        }
        window.addEventListener('error', onError);
        const error = console.error.bind(console);
        console.error = (...rest) => {
          onError();
          error(...rest);
        };
      `,
    )}`;
    return ['https://cdn.jsdelivr.net/npm/eruda@3.3.0', erudaInit];
  }

  // 兼容 sandpack
  #loadESBuildClient = async (iframe: HTMLIFrameElement, initSetup: SandboxSetup, _options?: ClientOptions) => {
    const { build, formatMessages } = await loadESBuild();
    const data = { ...initSetup };
    const decoder = new TextDecoder();
    const compile = async () => {
      let code = '';
      try {
        const { outputFiles } = await build({
          entryPoints: [this.#entry],
          target: 'es2022',
          platform: 'browser',
          format: 'esm',
          bundle: true,
          write: false,
          plugins: [
            {
              name: 'browserResolve',
              setup: ({ onResolve, onLoad }) => {
                onResolve({ filter: /.*/ }, async (args) => {
                  if (args.kind === 'entry-point' && args.path === '.') {
                    return { path: `/index` };
                  }
                  if (args.path.startsWith('.')) {
                    return { path: new URL(args.path, `file://${args.resolveDir}`).pathname };
                  }
                  return {
                    // TODO: 依赖版本号 `this.#dependencies`
                    path: `https://esm.sh/${args.path}`,
                    external: true,
                  };
                });
                onLoad({ filter: /.*/ }, (args) => {
                  const name = args.path.substring(1).toLowerCase();
                  let filename = '';
                  for (const ext of ['', '.js', '.ts']) {
                    const temp = `${name}${ext}`;
                    if (!(temp in data.files)) continue;
                    filename = temp;
                    break;
                  }
                  return {
                    loader: 'tsx',
                    contents: data.files[filename]?.code,
                  };
                });
              },
            },
          ],
        });
        code = decoder.decode(outputFiles![0].contents);
      } catch (e) {
        const msg = (await formatMessages(e.errors, { kind: 'error', color: false, terminalWidth: 100 })).join('\n');
        code = `console.error(\`${msg.replaceAll('\\', '\\\\').replaceAll('`', '\\`')}\`)`;
      }
      const htmlCode = `
        ${data.files[Object.keys(data.files).find((e) => e.toLowerCase() === 'index.html')!]?.code}
        ${this.#getErudaResources()
          .map((src) => `<script src="${src}"></script>`)
          .join('')}
        <script type="module" async>
          ${code};
          parent.postMessage('${loadEventName}', '*');
        </script>
      `;
      addEventListener('message', (evt) => {
        if (evt.data === loadEventName) this.#state({ status: 'done' });
      });
      if (document.head?.firstElementChild?.textContent?.includes('_html_')) {
        const search = new URLSearchParams({ _html_: await compressStringToBase64(htmlCode) });
        const url = new URL(`./?${search}`, location.href);
        iframe.src = url.href;
      } else {
        URL.revokeObjectURL(iframe.src);
        iframe.src = URL.createObjectURL(new Blob([htmlCode], { type: 'text/html' }));
      }
    };
    compile();
    return {
      listen: (..._rest) => {},
      updateSandbox: (sandboxSetup?: SandboxSetup) => {
        Object.assign(data, sandboxSetup);
        compile();
      },
      dispatch: ({ type }: SandpackMessage) => {
        switch (type) {
          case 'refresh':
            return this.#iframeRef.value?.contentWindow?.location.reload();
        }
      },
      destroy: () => URL.revokeObjectURL(iframe.src),
    } as SandpackClient;
  };

  #getLoadSandpackClient = async () => {
    const { loadSandpackClient } = (await import(
      /* webpackIgnore: true */ SANDPACK_CLIENT_ESM
    )) as typeof import('@codesandbox/sandpack-client');
    return loadSandpackClient;
  };

  #initSandpackClient = async () => {
    return (this.#useESMBuild ? this.#loadESBuildClient : await this.#getLoadSandpackClient())(
      this.#iframeRef.value!,
      {
        files: this.#state.files.reduce((p, c) => ({ ...p, [c.filename]: { code: c.code } }), {
          'sandbox.config.json': this.#sandBoxConfigFile,
          'index.html': { code: this.#indexTemplate },
          [this.#defaultEntryFilename]: { code: '' },
        } as SandpackBundlerFiles),
        entry: this.#entry,
        dependencies: this.#dependencies,
      },
      {
        showOpenInCodeSandbox: false,
        showLoadingScreen: false,
        // node 时只显示 console
        externalResources: this.#template === 'node' ? this.#getErudaResources(true) : [],
      },
    );
  };

  #updateSandbox = Utils.throttle(async () => {
    (await this.#sandpackClient)?.updateSandbox({
      files: this.#state.files.reduce((p, c) => ({ ...p, [c.filename]: { code: c.code } }), {
        'sandbox.config.json': this.#sandBoxConfigFile,
        'index.html': { code: this.#indexTemplate },
      } as SandpackBundlerFiles),
      entry: this.#entry,
      dependencies: this.#dependencies,
    });
  });

  #onClickTab = (ele: Pre) => {
    this.#state({
      files: this.#state.files.map((file) => {
        const status = file.element === ele ? 'active' : '';
        file.element.status = status;
        return { ...file, status };
      }),
    });
  };

  #onReset = async () => {
    const client = await this.#sandpackClient;
    if (!client) return;
    this.#state({ status: 'initialization' });
    client.dispatch({ type: 'refresh' });
  };

  #onFork = async () => {
    if (this.#state.forking) return;
    this.#state({ forking: true });
    // https://codesandbox.io/docs/learn/getting-started/your-first-sandbox#xhr-request
    const normalizedFiles = this.#state.files.reduce(
      (p, c) => ({
        ...p,
        [c.filename.replace('/', '')]: { content: c.code },
      }),
      {
        'sandbox.config.json': { content: this.#sandBoxConfigFile.code },
        'index.html': { content: this.#indexTemplate },
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
      this.#state({ forking: false });
    }
  };

  @willMount()
  #initState = () => {
    this.#state({ files: this.#parseContents() });
  };

  @mounted()
  #init = () => {
    const ob = new MutationObserver(() => {
      const files = this.#parseContents();
      this.#state({ files });
      this.#updateSandbox();
    });
    ob.observe(this, { childList: true, characterData: true, subtree: true });
    const io = new IntersectionObserver(async (entries) => {
      const { intersectionRatio } = entries.pop()!;
      if (intersectionRatio > 0 && !this.#sandpackClient) {
        this.#intoViewport();
      }
    });
    io.observe(this);
    return async () => {
      ob.disconnect();
      io.disconnect();
      (await this.#sandpackClient)?.destroy();
    };
  };

  render = () => {
    const { files, forking, status } = this.#state;
    if (!files.length) return;
    const currentFile = files.find((e) => e.status === 'active') || files.find((e) => e.status === '');
    return html`
      <div class="container">
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
          ::slotted(:not([data-filename='${currentFile?.filename}'])) {
            display: none;
          }
        </style>
        <div class="preview">
          <div class="sandbox" ?hidden=${status === 'done'}>
            <span class="status">${status.replace(/_|-/g, ' ')}...</span>
          </div>
          <iframe ${this.#iframeRef} class=${classMap({ sandbox: true, loading: status !== 'done' })}></iframe>
        </div>
      </div>
    `;
  };
}
