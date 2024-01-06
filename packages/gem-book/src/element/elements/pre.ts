import { customElement, attribute, refobject, RefObject, boolattribute } from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { styleMap } from '@mantou/gem/lib/utils';

import { theme } from '../helper/theme';

const prismjs = 'https://esm.sh/prismjs@v1.26.0';

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

const IGNORE_LINE = 2;

/**
 * @customElement gem-book-pre
 */
@customElement('gem-book-pre')
export class Pre extends GemElement {
  @attribute codelang: string;
  @attribute range: string;
  @attribute highlight: string;
  @attribute filename: string;
  @attribute status: 'hidden' | 'active' | '';
  @boolattribute editable: boolean;
  @boolattribute linenumber: boolean;
  @boolattribute headless: boolean;

  @refobject codeRef: RefObject<HTMLElement>;

  get #range() {
    return this.range || '1-';
  }

  get #linenumber() {
    return !!this.range || this.linenumber;
  }

  get #headless() {
    return !this.filename || this.headless;
  }

  constructor() {
    super();
    new MutationObserver(() => this.update()).observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  #getRanges(range: string, lines: string[]) {
    const len = lines.length;
    const ranges = range.trim().split(/\s*,\s*/);
    return ranges.map((range) => {
      // 第二位可以省略，第一位不行
      // 3-4
      // 2 => 2-2
      // 2- => 2-max
      // -2 => (-2)-(-2)
      // -2- => (-2)-max
      // 2--2 => 2-(-2)
      // -3--2 => (-3)-(-2)
      const [startStr, endStr = startStr] = range.split(/(?<!-|^)-/);
      const [start, end] = [parseInt(startStr) || 1, parseInt(endStr) || 0];
      // 包含首尾
      return [start < 0 ? len + start + 1 : start, end < 0 ? len + end + 1 : end || len].sort((a, b) => a - b);
    });
  }

  #getParts(s: string) {
    const lines = s.split(/\n|\r\n/);
    const ranges = this.#getRanges(this.#range, lines);
    const highlightLineSet = new Set(
      this.highlight
        ? this.#getRanges(this.highlight, lines)
            .map(([start, end]) => Array.from({ length: end - start + 1 }, (_, i) => start + i))
            .flat()
        : [],
    );
    const lineNumbersParts = Array.from<unknown, number[]>(ranges, () => []);
    const parts = ranges.map(([start, end], index) => {
      return Array.from({ length: end - start + 1 }, (_, i) => {
        const j = start + i - 1;
        lineNumbersParts[index].push(j + 1);
        return lines[j];
      }).join('\n');
    });
    return { parts, ranges, lineNumbersParts, highlightLineSet };
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
    const textNodeIterator = document.createNodeIterator(this.codeRef.element!, NodeFilter.SHOW_TEXT);
    while (true) {
      const textNode = textNodeIterator.nextNode();
      if (textNode && textNode !== selection?.focusNode) {
        this.#offset += textNode.nodeValue!.length;
      } else {
        this.#offset += selection.focusOffset;
        break;
      }
    }
    const content = this.codeRef.element!.textContent!;
    this.textContent = content;
  };

  #setOffset = () => {
    if (!this.editable || !this.#offset) return;
    const textNodeIterator = document.createNodeIterator(this.codeRef.element!, NodeFilter.SHOW_TEXT);
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

  mounted() {
    this.effect(async () => {
      if (!this.getBoundingClientRect().width) return;
      if (this.status === 'hidden') return;
      if (!this.codeRef.element) return;
      await import(/* @vite-ignore */ /* webpackIgnore: true */ prismjs);
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
      const { parts, lineNumbersParts } = this.#getParts(content);
      this.codeRef.element.innerHTML = parts.reduce(
        (p, c, i) =>
          p +
          `<span class="code-ignore token comment">  @@ ${lineNumbersParts[i - 1].at(-1)! + 1}-${
            lineNumbersParts[i].at(0)! - 1
          } @@</span>` +
          c,
      );
      this.#setOffset();
    });
  }

  render() {
    const { parts, lineNumbersParts, highlightLineSet } = this.#getParts(this.textContent || '');
    // Safari 精度问题所以使用整数像素单位
    const lineHeight = '24px';
    const padding = '1em';
    return html`
      <style>
        :host([status='hidden']) {
          display: none;
        }
        :host {
          display: block;
          font-family: ${theme.codeFont};
          background: rgba(${theme.textColorRGB}, 0.05);
        }
        .filename {
          font-size: 0.75em;
          padding: 1rem;
          line-height: 1;
          border-bottom: 1px solid ${theme.borderColor};
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          color: rgba(${theme.textColorRGB}, 0.5);
        }
        .container {
          height: 100%;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: currentColor;
          position: relative;
          display: flex;
          font-size: 0.875em;
          line-height: ${lineHeight};
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
          padding: ${padding};
          box-sizing: border-box;
          min-height: 100%;
          height: max-content;
        }
        .gem-code {
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: currentColor;
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
          color: rgba(${theme.textColorRGB}, 0.5);
          user-select: none;
        }
        .linenumber-ignore,
        .code-ignore {
          display: flex;
          place-items: center;
          height: calc(${IGNORE_LINE} * ${lineHeight});
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
          background: rgba(${theme.textColorRGB}, 0.05);
          width: 100%;
          height: ${lineHeight};
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
      </style>
      ${!this.#headless ? html`<div class="filename">${this.filename}</div>` : ''}
      <div class="container">
        ${lineNumbersParts
          .reduce((p, c) => p.concat(Array(IGNORE_LINE)).concat(c))
          .map((linenumber, index) =>
            highlightLineSet.has(linenumber)
              ? html`
                  <span
                    class="gem-highlight"
                    style=${styleMap({
                      top: `calc(${index} * ${lineHeight} + ${padding})`,
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
          ref=${this.codeRef.ref}
          class="gem-code"
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
