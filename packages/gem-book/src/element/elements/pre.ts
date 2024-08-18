import {
  customElement,
  attribute,
  createRef,
  boolattribute,
  shadow,
  GemElement,
  html,
  adoptedStyle,
  createCSSSheet,
  css,
  styleMap,
  mounted,
  memo,
} from '@mantou/gem';

import { theme } from '../helper/theme';
import { getParts, getRanges } from '../lib/utils';

const prismjs = 'https://esm.sh/prismjs@v1.29.0';

let contenteditableValue = 'true';
(() => {
  const div = document.createElement('div');
  div.setAttribute('contenteditable', 'plaintext-only');
  if (div.isContentEditable) contenteditableValue = 'plaintext-only';
})();

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
  cilkc: 'c',
  cilkcpp: 'cpp',
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
  gradle: 'clike',
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
  // https://github.com/PrismJS/prism/issues/3283#issuecomment-1001532061
  markdown: ['markup', 'yaml'],
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
  stata: ['mata', 'java', 'python'],
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
  'arm-asm': 'armasm',
  art: 'arturo',
  adoc: 'asciidoc',
  avs: 'avisynth',
  avdl: 'avro-idl',
  gawk: 'awk',
  sh: 'bash',
  shell: 'bash',
  shortcode: 'bbcode',
  rbnf: 'bnf',
  oscript: 'bsl',
  cs: 'csharp',
  dotnet: 'csharp',
  cfc: 'cfscript',
  'cilk-c': 'cilkc',
  'cilk-cpp': 'cilkcpp',
  cilk: 'cilkcpp',
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
  po: 'gettext',
  gni: 'gn',
  ld: 'linker-script',
  'go-mod': 'go-module',
  hbs: 'handlebars',
  mustache: 'handlebars',
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
  plantuml: 'plant-uml',
  pq: 'powerquery',
  mscript: 'powerquery',
  pbfasm: 'purebasic',
  purs: 'purescript',
  py: 'python',
  qs: 'qsharp',
  rkt: 'racket',
  razor: 'cshtml',
  rpy: 'renpy',
  res: 'rescript',
  robot: 'robotframework',
  rb: 'ruby',
  'sh-session': 'shell-session',
  shellsession: 'shell-session',
  smlnj: 'sml',
  sol: 'solidity',
  sln: 'solution-file',
  rq: 'sparql',
  sclang: 'supercollider',
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

const IGNORE_LINE = 2;
// Safari 精度问题所以使用整数像素单位
const LINE_HEIGHT = '24px';
const PADDING = '1em';

const styles = createCSSSheet(css`
  :host([status='hidden']) {
    display: none;
  }
  :host {
    display: block;
    font-family: ${theme.codeFont};
    background: rgb(from ${theme.textColor} r g b / 0.05);
    border-radius: ${theme.normalRound};
    overflow: hidden;
  }
  .filename {
    font-size: 0.75em;
    padding: 1rem;
    line-height: 1;
    border-bottom: 1px solid ${theme.borderColor};
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    color: rgb(from ${theme.textColor} r g b / 0.5);
  }
  .container {
    height: 100%;
    overflow-y: auto;
    scrollbar-width: thin;
    position: relative;
    display: flex;
    font-size: 0.875em;
    line-height: ${LINE_HEIGHT};
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
  .gem-code,
  .linenumber {
    padding: ${PADDING};
    box-sizing: border-box;
    min-height: 100%;
    height: max-content;
  }
  .gem-code {
    overflow-x: auto;
    scrollbar-width: thin;
    font-family: inherit;
    flex-grow: 1;
    text-align: left;
    white-space: pre;
    tab-size: 2;
    hyphens: none;
    overflow-clip-box: content-box;
    box-shadow: none;
    border: none;
    background: transparent;
    outline: none;
    caret-color: ${theme.textColor};
  }
  .linenumber {
    display: inline-flex;
    flex-direction: column;
    flex-shrink: 0;
    min-width: 3.5em;
    text-align: right;
    border-right: 1px solid ${theme.borderColor};
    color: rgb(from ${theme.textColor} r g b / 0.5);
    user-select: none;
  }
  .linenumber-ignore,
  .code-ignore {
    display: flex;
    place-items: center;
    height: calc(${IGNORE_LINE} * ${LINE_HEIGHT});
    user-select: none;
  }
  .code-ignore {
    place-content: start;
  }
  .linenumber-ignore {
    place-content: flex-end;
  }
  .linenumber-ignore::before {
    content: '·';
    border-radius: 1em;
    text-shadow:
      0 0.34em,
      0 -0.34em;
  }
  .gem-highlight {
    display: block;
    position: absolute;
    pointer-events: none;
    background: rgb(from ${theme.textColor} r g b / 0.05);
    width: 100%;
    height: ${LINE_HEIGHT};
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
@adoptedStyle(styles)
@shadow()
export class Pre extends GemElement {
  @attribute codelang: string;
  @attribute range: string;
  @attribute highlight: string;
  @attribute filename: string;
  @attribute status: 'hidden' | 'active' | '';
  @boolattribute editable: boolean;
  @boolattribute linenumber: boolean;
  @boolattribute headless: boolean;

  get #linenumber() {
    return !!this.range || this.linenumber;
  }

  get #headless() {
    return !this.filename || this.headless;
  }

  #codeRef = createRef<HTMLElement>();

  #ranges: number[][];
  #highlightLineSet: Set<number>;

  @memo((i) => [i.textContent, i.range, i.highlight])
  #setData = () => {
    const lines = (this.textContent || '').split(/\n|\r\n/);
    this.#ranges = getRanges(this.range, lines);
    this.#highlightLineSet = new Set(
      this.highlight
        ? getRanges(this.highlight, lines)
            .map(([start, end]) => Array.from({ length: end - start + 1 }, (_, i) => start + i))
            .flat()
        : [],
    );
  };

  #getParts(s: string) {
    return getParts(s.split(/\n|\r\n/), this.#ranges);
  }

  #composing = false;

  #compositionstartHandle = () => {
    this.#composing = true;
  };

  #compositionendHandle = (evt: CompositionEvent) => {
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1263817
    this.#composing = false;
    if (evt.data) {
      this.#onInputHandle();
    }
  };

  #onInput = (evt: InputEvent) => {
    if (this.#composing) return;
    // chrome compositionend
    if (evt.inputType === 'insertCompositionText') return;
    this.#onInputHandle();
  };

  #offset = 0;
  #onInputHandle = () => {
    const selection =
      'getSelection' in this.shadowRoot! ? (this.shadowRoot as unknown as Window).getSelection() : getSelection();
    if (!selection || selection.focusNode?.nodeType !== Node.TEXT_NODE) return;
    this.#offset = 0;
    const textNodeIterator = document.createNodeIterator(this.#codeRef.element!, NodeFilter.SHOW_TEXT);
    while (true) {
      const textNode = textNodeIterator.nextNode();
      if (textNode && textNode !== selection?.focusNode) {
        this.#offset += textNode.nodeValue!.length;
      } else {
        this.#offset += selection.focusOffset;
        break;
      }
    }
    const content = this.#codeRef.element!.textContent!;
    this.textContent = content;
  };

  #setOffset = () => {
    if (!this.editable || !this.#offset) return;
    const textNodeIterator = document.createNodeIterator(this.#codeRef.element!, NodeFilter.SHOW_TEXT);
    let offset = this.#offset;
    while (true) {
      const textNode = textNodeIterator.nextNode();
      if (!textNode) break;
      if (textNode.nodeValue!.length < offset) {
        offset -= textNode.nodeValue!.length;
      } else {
        const sel = window.getSelection();
        if (!sel) break;
        const range = document.createRange();
        range.setStart(textNode, offset);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        break;
      }
    }
  };

  #updateHtml = async () => {
    if (this.status === 'hidden') return;
    if (!this.#codeRef.element) return;
    await import(/* @vite-ignore */ /* webpackIgnore: true */ prismjs);
    const { Prism } = window as any;
    if (this.codelang && !Prism.languages[this.codelang]) {
      const codelang = langAliases[this.codelang] || this.codelang;
      const langDeps = ([] as string[]).concat(langDependencies[codelang] || []);
      const load = (lang: string) =>
        import(/* @vite-ignore */ /* webpackIgnore: true */ `${prismjs}/components/prism-${lang}.min.js`);
      try {
        await Promise.all(langDeps.map((langDep) => !Prism.languages[langDep] && load(langDep)));
        await load(codelang);
      } catch {
        //
      }
    }
    const htmlStr = Prism.languages[this.codelang]
      ? Prism.highlight(this.textContent || '', Prism.languages[this.codelang], this.codelang)
      : this.innerHTML;
    const { parts, lineNumbersParts } = this.#getParts(htmlStr);
    this.#codeRef.element.innerHTML = parts.reduce(
      (p, c, i) =>
        p +
        `<span class="code-ignore token comment">  @@ ${lineNumbersParts[i - 1].at(-1)! + 1}-${
          lineNumbersParts[i].at(0)! - 1
        } @@</span>` +
        c,
    );
    this.#setOffset();
  };

  @mounted()
  #init = () => {
    const ob = new MutationObserver(() => this.update());
    ob.observe(this, { childList: true, characterData: true, subtree: true });
    const io = new IntersectionObserver((entries) => {
      entries.forEach(({ intersectionRatio }) => {
        if (intersectionRatio === 0) return;
        io.disconnect();
        this.effect(
          () => this.#updateHtml(),
          () => [this.textContent, this.codelang],
        );
      });
    });
    io.observe(this);
    return () => {
      io.disconnect();
      ob.disconnect();
    };
  };

  render() {
    const { parts, lineNumbersParts } = this.#getParts(this.textContent || '');
    return html`
      ${!this.#headless ? html`<div class="filename">${this.filename}</div>` : ''}
      <div class="container">
        ${lineNumbersParts
          .reduce((p, c) => p.concat(Array(IGNORE_LINE)).concat(c))
          .map((linenumber, index) =>
            this.#highlightLineSet.has(linenumber)
              ? html`
                  <span
                    class="gem-highlight"
                    style=${styleMap({
                      top: `calc(${index} * ${LINE_HEIGHT} + ${PADDING})`,
                    })}
                  ></span>
                `
              : '',
          )}
        ${this.#linenumber
          ? html`
              <div class="linenumber">
                ${lineNumbersParts.map(
                  (numbers, index, arr) => html`
                    ${numbers.map((n) => html`<span>${n}</span>`)}${arr.length - 1 !== index
                      ? html`<span class="linenumber-ignore"></span>`
                      : ''}
                  `,
                )}
              </div>
            `
          : ''}
        <code
          ref=${this.#codeRef.ref}
          class="gem-code"
          spellcheck="false"
          contenteditable=${this.editable ? contenteditableValue : false}
          @compositionstart=${this.#compositionstartHandle}
          @compositionend=${this.#compositionendHandle}
          @input=${this.#onInput}
          >${parts.join('\n'.repeat(IGNORE_LINE + 1))}</code
        >
      </div>
    `;
  }
}
