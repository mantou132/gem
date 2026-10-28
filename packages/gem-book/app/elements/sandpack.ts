import type {
  ClientOptions,
  ClientStatus,
  SandboxSetup,
  SandpackBundlerFiles,
  SandpackClient,
  SandpackMessage,
  SandpackTemplate,
} from '@codesandbox/sandpack-client';
import {
  adoptedStyle,
  attribute,
  boolattribute,
  classMap,
  createRef,
  createState,
  css,
  customElement,
  GemElement,
  html,
  mounted,
  shadow,
  template,
} from '@mantou/gem';

import { icons } from '../lib/icons';
import { primaryTextColor, theme } from '../lib/theme';
import type { CodeFile } from '../lib/types';
import type { GemBookCodeElement } from './code';
import { getDefaultFile } from './code-group';

const AUTO_IMPORT = 'https://raw.githubusercontent.com/mantou132/gem/main/crates/swc-plugin-gem/src/auto-import.json';
const ESBUILD_URL = 'https://esm.sh/esbuild-wasm@0.24.0';
const CSB_URL = 'https://codesandbox.io/api/v1/sandboxes/define?json=1';
const SANDPACK_CLIENT_ESM = 'https://esm.sh/@codesandbox/sandpack-client@2.18.2?bundle';
const LZ_STRING_ESM = 'https://esm.sh/lz-string@1.5.0';
const ERUDA_URL = 'https://unpkg.com/eruda@3.3.0';

/** iframe 中的代码执行后通知 */
const LOAD_EVENT = '_load_';

const DEFAULT_ENTRY = 'index.ts';

let esbuildPromise: Promise<typeof import('esbuild')> | undefined;

const loadESBuild = (): Promise<typeof import('esbuild')> =>
  (esbuildPromise ??= (async () => {
    const { default: esbuild } = await import(/* webpackIgnore: true */ ESBUILD_URL);
    await esbuild.initialize({ wasmURL: `${ESBUILD_URL}/esbuild.wasm`, worker: true });
    return esbuild;
  })());

type AutoImportConfig = { members: Record<string, Set<string>>; tagMap: Map<RegExp, string> };

let autoImportPromise: Promise<{ members: Record<string, string[]>; elements: Record<string, Record<string, string>> }>;

/** swc-plugin-gem 的自动导入配置 */
const loadAutoImport = () =>
  (autoImportPromise ??= fetch(AUTO_IMPORT)
    .then((res) => res.json())
    .catch(() => ({ members: {}, elements: {} })));

/** 只显示控制台，`always` 为 `false` 时只在出错时显示 */
const getErudaResources = (always = false) => {
  const init = `
    const root = document.createElement('div');
    document.body.append(root);
    eruda.init({ container: root, tool: ['console'] });
    const style = new CSSStyleSheet();
    style.replace(\`
      .eruda-dev-tools, .eruda-console { top: 0; border: none; padding: 0 !important; height: 100% !important; }
      .eruda-resizer, .eruda-tab, .eruda-entry-btn, .eruda-control, .eruda-js-input { display: none !important; }
    \`);
    root.shadowRoot.adoptedStyleSheets.push(style);
    if (${always}) eruda.show();
    const onError = () => {
      eruda.show();
      parent.postMessage('${LOAD_EVENT}', '*');
    };
    window.addEventListener('error', onError);
    const error = console.error.bind(console);
    console.error = (...rest) => {
      onError();
      error(...rest);
    };
  `;
  return [ERUDA_URL, `data:application/javascript;base64,${btoa(init)}`];
};

const style = css`
  :host {
    display: block;
    margin: 2rem 0;
    container-type: inline-size;
  }
  .container {
    display: grid;
    grid-template: 'tabs tabs' auto 'code preview' 1fr / 50% 50%;
    border-radius: ${theme.normalRound};
    overflow: hidden;
    background: rgb(from ${theme.textColor} r g b / 0.03);
  }
  .header {
    grid-area: tabs;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.875em;
    border-bottom: 1px solid ${theme.borderColor};
  }
  .tabs {
    display: flex;
    padding-inline: 0.5em;
  }
  button {
    all: unset;
    display: flex;
    align-items: center;
    gap: 0.3em;
    padding: 0.6em 0.75em;
    cursor: pointer;
    color: rgb(from ${theme.textColor} r g b / 0.6);
    svg {
      width: 1em;
      height: 1em;
    }
  }
  button:hover,
  .current {
    color: ${primaryTextColor};
  }
  .current {
    box-shadow: inset 0 -2px currentColor;
  }
  .actions {
    display: flex;
    padding-inline-end: 0.5em;
  }
  ::slotted(*) {
    grid-area: code;
    max-height: 70vh;
    margin: 0 !important;
    border-radius: 0 !important;
    background: none !important;
  }
  .preview {
    grid-area: preview;
    position: relative;
    display: flex;
    padding: 1.5em;
    background: rgb(from ${theme.textColor} r g b / 0.05);
  }
  .status {
    position: absolute;
    inset: 1.5em;
    padding: 0.5em;
    text-transform: capitalize;
    color: rgb(from ${theme.textColor} r g b / 0.6);
  }
  iframe {
    position: sticky;
    top: calc(${theme.headerHeight} + 1.5em);
    width: 100%;
    min-height: 300px;
    height: 50%;
    border: none;
    border-radius: ${theme.normalRound};
    background: ${theme.backgroundColor};
    color-scheme: light;
  }
  .loading {
    /* Safari 不加载隐藏的 iframe */
    opacity: 0;
  }
  @container (width < 700px) {
    .container {
      grid-template: 'tabs' 'code' 'preview' / 100%;
    }
    .preview {
      padding: 1em;
      border-top: 1px solid ${theme.borderColor};
    }
    .status {
      inset: 1em;
    }
    iframe {
      min-height: auto;
      height: 35vh;
    }
    .actions {
      display: none;
    }
    ::slotted(*) {
      height: 35vh;
    }
  }
  @media print {
    .container {
      display: block;
    }
    .actions,
    .preview {
      display: none;
    }
  }
`;

type Status = ClientStatus | 'initialization' | 'done';

/**
 * 可以编辑和运行的示例，子元素是可以编辑的代码块，插槽和 `files` 由服务端渲染 Markdown 时生成，
 * 没有 `template` 时在浏览器中使用 esbuild 编译，否则使用 Sandpack
 */
@customElement('gbp-sandpack')
@adoptedStyle(style)
@shadow()
export class GbpSandpackElement extends GemElement {
  @attribute entry: string;
  /** 依赖，例如 `@mantou/gem, duoyun-ui@1.0.0` */
  @attribute dependencies: string;
  @attribute template: SandpackTemplate;
  @attribute tailwind: 'all' | 'basic';
  @boolattribute hotreload: boolean;
  /** 代码块的文件名和状态，JSON */
  @attribute files: string;

  #iframeRef = createRef<HTMLIFrameElement>();

  #state = createState({ current: -1, forking: false, status: 'initialization' as Status });

  #client?: Promise<SandpackClient>;

  get #files(): CodeFile[] {
    return JSON.parse(this.files || '[]').map((file: CodeFile) => ({
      ...file,
      filename: (file.filename || DEFAULT_ENTRY).toLowerCase(),
    }));
  }

  get #entry() {
    return this.entry || '.';
  }

  get #dependencies() {
    return Object.fromEntries(
      this.dependencies
        .split(',')
        .map((dep) => dep.trim())
        .filter(Boolean)
        .map((dep) => {
          const [name, version = 'latest'] = dep.split(/(.+)@/).filter(Boolean);
          return [name, version];
        }),
    );
  }

  get #configFile() {
    return {
      code: JSON.stringify({ hardReloadOnChange: !this.hotreload, infiniteLoopProtection: true, view: 'browser' }),
    };
  }

  get #indexTemplate() {
    const tailwind = this.tailwind
      ? `
        <style type="text/tailwindcss">
          @layer theme, base, components, utilities;
          @import "tailwindcss/theme.css" layer(theme);
          ${this.tailwind === 'all' ? '@import "tailwindcss/preflight.css" layer(base);' : ''}
          @import "tailwindcss/utilities.css" layer(utilities);
        </style>
        <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
      `
      : '';
    return `
      <!DOCTYPE html>
      <style>
        body {
          font: ${getComputedStyle(document.body).font};
          -webkit-font-smoothing: antialiased;
        }
        app-root:not(:defined) {
          display: contents;
        }
      </style>
      <app-root id="root"></app-root>
      ${tailwind}
    `.trim();
  }

  /** 当前代码，编辑后也是最新的 */
  #getFiles = () => {
    const elements = [...this.querySelectorAll<GemBookCodeElement>('gem-book-code')];
    return this.#files.map((file, index) => ({ ...file, code: elements[index]?.code || '' }));
  };

  /** 自动导入 Gem 的成员和元素，加在第一行，所以错误的行号多一行 */
  #applyImport = (
    { members, tagMap }: AutoImportConfig,
    { code, filename }: { filename: string; code: string },
    filenames: string[],
  ) => {
    if (!/\.m?[jt]s$/i.test(filename)) return code;
    const autoImport = Object.fromEntries(Object.entries(members).map(([pkg, set]) => [pkg, new Set(set)]));
    for (const { groups } of code.matchAll(/import\s*(type)?\s*{(?<line>.*?)}\s*from\s*('|")(?<pkg>.*?)\3/gs)) {
      groups!.line.split(',').forEach((member) => autoImport[groups!.pkg]?.delete(member.trim()));
    }
    const lines = new Set<string>();
    Object.entries(autoImport).forEach(([pkg, set]) => {
      if (set.size) lines.add(`import {${[...set].join(',')}} from '${pkg}'`);
    });
    const tags = new Set([...code.matchAll(/<(?<tag>\w+(-\w+)+)(\s|>)/gs)].map(({ groups }) => groups!.tag));
    tags.forEach((tag) => {
      for (const [reg, replace] of tagMap) {
        if (!replace) continue;
        const importPath = tag.replace(reg, replace);
        if (importPath !== tag) {
          lines.add(`import '${importPath}'`);
          break;
        }
      }
      // 示例中定义的元素
      if (filenames.includes(`${tag}.ts`)) lines.add(`import './${tag}'`);
    });
    return `${[...lines].join(';')}\n${code}`;
  };

  #getAutoImportConfig = async (): Promise<AutoImportConfig> => {
    const config = await loadAutoImport();
    const deps = new Set(Object.keys(this.#dependencies));
    const members = Object.fromEntries(
      Object.entries(config.members)
        .filter(([pkg]) => deps.has(pkg))
        .map(([pkg, list]) => [pkg, new Set(list)]),
    );
    const tagMap = new Map(
      Object.entries(config.elements)
        .filter(([pkg]) => deps.has(pkg))
        .flatMap(([pkg, map]) =>
          Object.entries(map).map(
            ([tag, path]) => [new RegExp(tag.replace('*', '(.*)')), `${pkg}${path.replace('*', '$1')}`] as const,
          ),
        ),
    );
    return { members, tagMap };
  };

  #getSandboxFiles = async () => {
    const config = await this.#getAutoImportConfig();
    const files = this.#getFiles();
    const filenames = files.map(({ filename }) => filename);
    return Object.fromEntries([
      ['sandbox.config.json', this.#configFile],
      ['index.html', { code: this.#indexTemplate }],
      ...files.map((file) => [file.filename, { code: this.#applyImport(config, file, filenames) }]),
    ]) as SandpackBundlerFiles;
  };

  /** 和 Sandpack 客户端兼容，在浏览器中使用 esbuild 编译 */
  #loadESBuildClient = async (iframe: HTMLIFrameElement, initSetup: SandboxSetup, _options?: ClientOptions) => {
    const { build, formatMessages } = await loadESBuild();
    let data = { ...initSetup };
    const decoder = new TextDecoder();
    addEventListener('message', (evt) => {
      if (evt.data === LOAD_EVENT) this.#state({ status: 'done' });
    });
    let htmlCode = '';
    /**
     * 不使用 `blob:` 地址，其中不能使用 history，`document.open` 后文档的地址是当前页面的地址；
     * 每次导航到 `about:blank` 得到新的 window，元素不能重复定义
     */
    const render = () => {
      iframe.addEventListener(
        'load',
        () => {
          const doc = iframe.contentDocument!;
          doc.open();
          doc.write(htmlCode);
          doc.close();
        },
        { once: true },
      );
      iframe.src = 'about:blank';
    };
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
                onResolve({ filter: /.*/ }, (args) => {
                  if (args.kind === 'entry-point' && args.path === '.') return { path: '/index' };
                  if (args.path.startsWith('.'))
                    return { path: new URL(args.path, `file://${args.resolveDir}`).pathname };
                  // TODO: 依赖的版本号
                  return { path: `https://esm.sh/${args.path}`, external: true };
                });
                onLoad({ filter: /.*/ }, (args) => {
                  const name = args.path.substring(1).toLowerCase();
                  const filename = ['', '.js', '.ts'].map((ext) => `${name}${ext}`).find((e) => e in data.files) || '';
                  return { loader: 'tsx', contents: data.files[filename]?.code };
                });
              },
            },
          ],
        });
        code = decoder.decode(outputFiles![0].contents);
      } catch (err) {
        const msg = (await formatMessages(err.errors, { kind: 'error', color: false, terminalWidth: 100 })).join('\n');
        code = `console.error(\`${msg.replaceAll('\\', '\\\\').replaceAll('`', '\\`')}\`)`;
      }
      const indexFile = Object.keys(data.files).find((e) => e.toLowerCase() === 'index.html')!;
      // 示例中的路由从 `/` 开始
      htmlCode = `
        <script>history.replaceState(null, '', '/')</script>
        ${data.files[indexFile]?.code}
        ${getErudaResources()
          .map((src) => `<script src="${src}"></script>`)
          .join('')}
        <script type="module">
          ${code};
          parent.postMessage('${LOAD_EVENT}', '*');
        </script>
      `;
      render();
    };
    compile();
    return {
      listen: () => () => {},
      updateSandbox: (setup?: SandboxSetup) => {
        data = { ...data, ...setup };
        compile();
      },
      dispatch: ({ type }: SandpackMessage) => {
        if (type === 'refresh') render();
      },
      destroy: () => {},
    } as unknown as SandpackClient;
  };

  #initClient = async () => {
    const setup = { files: await this.#getSandboxFiles(), entry: this.#entry, dependencies: this.#dependencies };
    if (!this.template) return this.#loadESBuildClient(this.#iframeRef.value!, setup);
    const { loadSandpackClient } = (await import(
      /* webpackIgnore: true */ SANDPACK_CLIENT_ESM
    )) as typeof import('@codesandbox/sandpack-client');
    const client = await loadSandpackClient(this.#iframeRef.value!, setup, {
      showOpenInCodeSandbox: false,
      showLoadingScreen: false,
      // node 时只显示控制台
      externalResources: this.template === 'node' ? getErudaResources(true) : [],
    });
    client.listen((msg) => {
      if (msg.type === 'status') this.#state({ status: msg.status });
      if (msg.type === 'done') this.#state({ status: 'done' });
    });
    return client;
  };

  #timer = 0;

  /** 编辑代码后更新，同时编辑多次只更新一次 */
  #onInput = () => {
    clearTimeout(this.#timer);
    this.#timer = window.setTimeout(async () => {
      const client = await this.#client;
      client?.updateSandbox({
        files: await this.#getSandboxFiles(),
        entry: this.#entry,
        dependencies: this.#dependencies,
      });
    }, 1000);
  };

  #onReset = async () => {
    const client = await this.#client;
    if (!client) return;
    this.#state({ status: 'initialization' });
    client.dispatch({ type: 'refresh' });
  };

  /** 在 CodeSandbox 中打开 https://codesandbox.io/docs/learn/getting-started/your-first-sandbox#xhr-request */
  #onFork = async () => {
    if (this.#state.forking) return;
    this.#state({ forking: true });
    try {
      const sandboxFiles = await this.#getSandboxFiles();
      const files = {
        ...Object.fromEntries(
          Object.entries(sandboxFiles).map(([name, { code }]) => [name.replace('/', ''), { content: code }]),
        ),
        'package.json': { content: { main: this.#entry, dependencies: this.#dependencies } },
      };
      const { default: lzString } = await import(/* webpackIgnore: true */ LZ_STRING_ESM);
      const parameters = lzString
        .compressToBase64(JSON.stringify({ files }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const res = await fetch(CSB_URL, {
        method: 'post',
        body: new URLSearchParams({ parameters }).toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const { sandbox_id } = await res.json();
      open(`https://codesandbox.io/s/${sandbox_id}`);
    } finally {
      this.#state({ forking: false });
    }
  };

  // 进入视口时才加载
  @mounted()
  #init = () => {
    const io = new IntersectionObserver((entries) => {
      if (entries.some(({ isIntersecting }) => isIntersecting) && !this.#client) {
        this.#client = this.#initClient();
        io.disconnect();
      }
    });
    io.observe(this);
    this.addEventListener('input', this.#onInput);
    return async () => {
      io.disconnect();
      (await this.#client)?.destroy();
    };
  };

  @template()
  #content = () => {
    const { forking, status } = this.#state;
    const files = this.#files;
    const current = this.#state.current < 0 ? getDefaultFile(files) : this.#state.current;
    return html`
      <div class="container">
        <div class="header">
          <div class="tabs">
            ${files.map(
              ({ filename, status: fileStatus }, index) => html`
                <button
                  v-if=${fileStatus !== 'hidden'}
                  class=${classMap({ current: index === current })}
                  @click=${() => this.#state({ current: index })}
                >
                  ${filename}
                </button>
              `,
            )}
          </div>
          <div class="actions">
            <button @click=${this.#onReset}>Reset</button>
            <button @click=${this.#onFork}>Fork${forking ? '...' : icons.link}</button>
          </div>
        </div>
        <slot name=${current}></slot>
        <div class="preview">
          <span v-if=${status !== 'done'} class="status">${status.replace(/_|-/g, ' ')}...</span>
          <iframe ${this.#iframeRef} class=${classMap({ loading: status !== 'done' })}></iframe>
        </div>
      </div>
    `;
  };
}
