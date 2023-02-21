// https://spectrum.adobe.com/page/code/
import {
  adoptedStyle,
  customElement,
  attribute,
  refobject,
  RefObject,
  boolattribute,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';

import { theme } from '../helper/theme';

const prismjs = 'https://cdn.skypack.dev/prismjs@v1.26.0';

// https://github.com/PrismJS/prism/blob/master/plugins/autoloader/prism-autoloader.js
const langDependencies: Record<string, string | string[]> = {
  javascript: 'clike',
  actionscript: 'javascript',
  apex: ['clike', 'sql'],
  arduino: 'cpp',
  aspnet: ['markup', 'csharp'],
  birb: 'clike',
  bison: 'c',
  c: 'clike',
  csharp: 'clike',
  cpp: 'c',
  cfscript: 'clike',
  chaiscript: ['clike', 'cpp'],
  coffeescript: 'javascript',
  crystal: 'ruby',
  'css-extras': 'css',
  d: 'clike',
  dart: 'clike',
  django: 'markup-templating',
  ejs: ['javascript', 'markup-templating'],
  etlua: ['lua', 'markup-templating'],
  erb: ['ruby', 'markup-templating'],
  fsharp: 'clike',
  'firestore-security-rules': 'clike',
  flow: 'javascript',
  ftl: 'markup-templating',
  gml: 'clike',
  glsl: 'c',
  go: 'clike',
  groovy: 'clike',
  haml: 'ruby',
  handlebars: 'markup-templating',
  haxe: 'clike',
  hlsl: 'c',
  idris: 'haskell',
  java: 'clike',
  javadoc: ['markup', 'java', 'javadoclike'],
  jolie: 'clike',
  jsdoc: ['javascript', 'javadoclike', 'typescript'],
  'js-extras': 'javascript',
  json5: 'json',
  jsonp: 'json',
  'js-templates': 'javascript',
  kotlin: 'clike',
  latte: ['clike', 'markup-templating', 'php'],
  less: 'css',
  lilypond: 'scheme',
  liquid: 'markup-templating',
  markdown: 'markup',
  'markup-templating': 'markup',
  mongodb: 'javascript',
  n4js: 'javascript',
  objectivec: 'c',
  opencl: 'c',
  parser: 'markup',
  php: 'markup-templating',
  phpdoc: ['php', 'javadoclike'],
  'php-extras': 'php',
  plsql: 'sql',
  processing: 'clike',
  protobuf: 'clike',
  pug: ['markup', 'javascript'],
  purebasic: 'clike',
  purescript: 'haskell',
  qsharp: 'clike',
  qml: 'javascript',
  qore: 'clike',
  racket: 'scheme',
  cshtml: ['markup', 'csharp'],
  jsx: ['markup', 'javascript'],
  tsx: ['jsx', 'typescript'],
  reason: 'clike',
  ruby: 'clike',
  sass: 'css',
  scss: 'css',
  scala: 'java',
  'shell-session': 'bash',
  smarty: 'markup-templating',
  solidity: 'clike',
  soy: 'markup-templating',
  sparql: 'turtle',
  sqf: 'clike',
  squirrel: 'clike',
  't4-cs': ['t4-templating', 'csharp'],
  't4-vb': ['t4-templating', 'vbnet'],
  tap: 'yaml',
  tt2: ['clike', 'markup-templating'],
  textile: 'markup',
  twig: 'markup-templating',
  typescript: 'javascript',
  v: 'clike',
  vala: 'clike',
  vbnet: 'basic',
  velocity: 'markup',
  wiki: 'markup',
  xeora: 'markup',
  'xml-doc': 'markup',
  xquery: 'markup',
};
const langAliases: Record<string, string> = {
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  mathml: 'markup',
  ssml: 'markup',
  atom: 'markup',
  rss: 'markup',
  js: 'javascript',
  g4: 'antlr4',
  ino: 'arduino',
  adoc: 'asciidoc',
  avs: 'avisynth',
  avdl: 'avro-idl',
  shell: 'bash',
  shortcode: 'bbcode',
  rbnf: 'bnf',
  oscript: 'bsl',
  cs: 'csharp',
  dotnet: 'csharp',
  cfc: 'cfscript',
  coffee: 'coffeescript',
  conc: 'concurnas',
  jinja2: 'django',
  'dns-zone': 'dns-zone-file',
  dockerfile: 'docker',
  gv: 'dot',
  eta: 'ejs',
  xlsx: 'excel-formula',
  xls: 'excel-formula',
  gamemakerlanguage: 'gml',
  gni: 'gn',
  'go-mod': 'go-module',
  hbs: 'handlebars',
  hs: 'haskell',
  idr: 'idris',
  gitignore: 'ignore',
  hgignore: 'ignore',
  npmignore: 'ignore',
  webmanifest: 'json',
  kt: 'kotlin',
  kts: 'kotlin',
  kum: 'kumir',
  tex: 'latex',
  context: 'latex',
  ly: 'lilypond',
  emacs: 'lisp',
  elisp: 'lisp',
  'emacs-lisp': 'lisp',
  md: 'markdown',
  moon: 'moonscript',
  n4jsd: 'n4js',
  nani: 'naniscript',
  objc: 'objectivec',
  qasm: 'openqasm',
  objectpascal: 'pascal',
  px: 'pcaxis',
  pcode: 'peoplecode',
  pq: 'powerquery',
  mscript: 'powerquery',
  pbfasm: 'purebasic',
  purs: 'purescript',
  py: 'python',
  qs: 'qsharp',
  rkt: 'racket',
  razor: 'cshtml',
  rpy: 'renpy',
  robot: 'robotframework',
  rb: 'ruby',
  'sh-session': 'shell-session',
  shellsession: 'shell-session',
  smlnj: 'sml',
  sol: 'solidity',
  sln: 'solution-file',
  rq: 'sparql',
  t4: 't4-cs',
  trickle: 'tremor',
  troy: 'tremor',
  trig: 'turtle',
  ts: 'typescript',
  tsconfig: 'typoscript',
  uscript: 'unrealscript',
  uc: 'unrealscript',
  url: 'uri',
  vb: 'visual-basic',
  vba: 'visual-basic',
  webidl: 'web-idl',
  mathematica: 'wolfram',
  nb: 'wolfram',
  wl: 'wolfram',
  xeoracube: 'xeora',
  yml: 'yaml',
};

const style = createCSSSheet(css`
  :host([hidden]) {
    display: none;
  }
  :host {
    position: relative;
    display: block;
    font-size: 0.875em;
    background: rgba(${theme.textColorRGB}, 0.05);
    --comment-color: var(--code-comment-color, #6e6e6e);
    --section-color: var(--code-section-color, #c9252d);
    --title-color: var(--code-title-color, #4646c6);
    --variable-color: var(--code-variable-color, #ae0e66);
    --literal-color: var(--code-literal-color, #6f38b1);
    --string-color: var(--code-string-color, #12805c);
    --function-color: var(--code-function-color, #0d66d0);
    --keyword-color: var(--code-keyword-color, #93219e);
    --attribute-color: var(--code-attribute-color, #4646c6);
  }
  .highlight {
    display: block;
    position: absolute;
    pointer-events: none;
    background: black;
    opacity: 0.05;
    width: 100%;
  }
  .code {
    height: 100%;
    box-sizing: border-box;
    display: block;
    font-family: ${theme.codeFont};
    text-align: left;
    white-space: pre;
    tab-size: 2;
    hyphens: none;
    overflow: auto;
    overflow-clip-box: content-box;
    box-shadow: none;
    border: none;
    background: transparent;
    scrollbar-width: thin;
  }
  .code::-webkit-scrollbar {
    height: 0.5em;
  }
  .code::-webkit-scrollbar-thumb {
    border-radius: inherit;
  }
  .token.comment,
  .token.prolog,
  .token.doctype,
  .token.cdata {
    color: var(--comment-color);
    font-style: italic;
  }
  .token.punctuation {
    color: var(--title-color);
  }
  .token.tag .punctuation {
    color: ${theme.textColor};
  }
  .token.tag,
  .token.tag .class-name,
  .token.property,
  .token.constant,
  .token.symbol,
  .token.deleted,
  .token.operator,
  .token.entity {
    color: var(--section-color);
  }
  .token.url,
  .language-css .token.string,
  .style .token.string,
  .token.variable {
    color: var(--variable-color);
  }
  .token.boolean,
  .token.number {
    color: var(--literal-color);
  }
  .token.attr-value,
  .token.string,
  .token.char,
  .token.builtin,
  .token.inserted {
    color: var(--string-color);
  }
  .token.atrule,
  .token.function,
  .token.class-name {
    color: var(--function-color);
  }
  .token.keyword {
    color: var(--keyword-color);
  }
  .token.selector,
  .token.attr-name,
  .token.regex,
  .token.important {
    color: var(--attribute-color);
  }
  .token.important,
  .token.bold {
    font-weight: bold;
  }
  .token.italic {
    font-style: italic;
  }
  .token.entity {
    cursor: help;
  }
  @media print {
    code {
      border-left: 5px solid ${theme.borderColor};
      white-space: pre-wrap;
      word-break: break-word;
    }
    .highlight {
      display: none;
    }
  }
`);

/**
 * @customElement gem-book-pre
 */
@customElement('gem-book-pre')
@adoptedStyle(style)
export class Pre extends GemElement {
  @attribute codelang: string;
  @attribute range: string;
  @attribute highlight: string;
  @attribute filename: string;
  @boolattribute hidden: boolean;

  @refobject codeRef: RefObject<HTMLElement>;

  constructor() {
    super();
    new MutationObserver(() => this.update()).observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  #getRanges(range: string) {
    const ranges = range.split(/,\s*/);
    return ranges.map((range) => {
      const [start, end = start] = range.split('-');
      return [parseInt(start) || 1, parseInt(end) || 0];
    });
  }

  #getParts(s: string) {
    const lines = s.split(/\n|\r\n/);
    const parts = this.range
      ? this.#getRanges(this.range).map(([start, end]) => {
          let result = '';
          for (let i = start - 1; i < (end || lines.length); i++) {
            result += lines[i] + '\n';
          }
          return result;
        })
      : [s];
    return parts.join('\n...\n\n');
  }

  mounted() {
    this.effect(async () => {
      if (this.hidden) return;
      if (!this.codeRef.element) return;
      this.codeRef.element.innerHTML = this.innerHTML;
      await import(/* @vite-ignore */ /* webpackIgnore: true */ `${prismjs}?min`);
      const { Prism } = window as any;
      if (this.codelang && !Prism.languages[this.codelang]) {
        const lang = langAliases[this.codelang] || this.codelang;
        const langDeps = ([] as string[]).concat(langDependencies[lang] || []);
        try {
          await Promise.all(
            langDeps.map((langDep) => {
              if (!Prism.languages[langDep]) {
                return import(
                  /* @vite-ignore */ /* webpackIgnore: true */ `${prismjs}/components/prism-${langDep}.min.js`
                );
              }
            }),
          );
          await import(/* @vite-ignore */ /* webpackIgnore: true */ `${prismjs}/components/prism-${lang}.min.js`);
        } catch {
          //
        }
      }
      const content = Prism.languages[this.codelang]
        ? Prism.highlight(this.textContent || '', Prism.languages[this.codelang], this.codelang)
        : this.innerHTML;
      this.codeRef.element.innerHTML = this.#getParts(content);
    });
  }

  render() {
    // Safari 精度问题
    const lineHeight = 1.7;
    const padding = 1;
    return html`
      ${this.highlight
        ? this.#getRanges(this.highlight).map(
            ([start, end]) =>
              html`
                <span
                  class="highlight"
                  style=${styleMap({
                    top: `${(start - 1) * lineHeight + padding}em`,
                    height: `${(end - start + 1) * lineHeight}em`,
                  })}
                ></span>
              `,
          )
        : ''}
      <code ref=${this.codeRef.ref} class="code">${this.#getParts(this.textContent || '')}</code>
      <style>
        code {
          padding: ${padding}em;
          line-height: ${lineHeight};
        }
      </style>
    `;
  }
}
