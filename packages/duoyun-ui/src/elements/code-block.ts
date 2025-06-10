// https://spectrum.adobe.com/page/code/
import { adoptedStyle, attribute, customElement, effect, mounted, shadow } from '@mantou/gem/lib/decorators';
import { createRef, css, html } from '@mantou/gem/lib/element';
import { styleMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { DuoyunVisibleBaseElement } from './base/visible';

const prismjs = 'https://esm.sh/prismjs@v1.26.0';

// https://github.com/PrismJS/prism/blob/master/plugins/autoloader/prism-autoloader.js
const langDependencies: Record<string, string | string[]> = {
  javascript: ['clike', 'js-templates'],
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
  typescript: ['javascript', 'js-templates'],
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
  rs: 'rust',
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

const lineHeight = 1.5;
const padding = 1;

const style = css`
  :host(:where(:not([hidden]))) {
    position: relative;
    display: block;
    font-size: 0.875em;
    background: ${theme.lightBackgroundColor};
    border-radius: ${theme.normalRound};
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
    background: ${theme.highlightColor};
    opacity: 0.1;
    width: 100%;
  }
  .code {
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
    padding: ${padding}em;
    line-height: ${lineHeight};
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
    .code {
      border-left: 5px solid ${theme.borderColor};
      white-space: pre-wrap;
      word-break: break-word;
    }
    .highlight {
      display: none;
    }
  }
`;

@customElement('dy-code-block')
@adoptedStyle(style)
@shadow()
export class DuoyunCodeBlockElement extends DuoyunVisibleBaseElement {
  @attribute codelang: string;
  @attribute range: string;
  @attribute highlight: string;

  #codeRef = createRef<HTMLElement>();

  #getRanges(str: string) {
    const ranges = str.split(/,\s*/);
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
            result += `${lines[i]}\n`;
          }
          return result;
        })
      : [s];
    return parts.join('\n...\n\n');
  }

  @mounted()
  #init = () => {
    const ob = new MutationObserver(() => this.update());
    ob.observe(this, { childList: true, characterData: true, subtree: true });
    this.addEventListener('show', this.#updateHtml, { once: true });
    return () => ob.disconnect();
  };

  @effect((i) => [i.textContent, i.codelang, i.range])
  #updateHtml = async () => {
    if (!this.visible) return;
    if (!this.#codeRef.value) return;

    await import(/* @vite-ignore */ /* webpackIgnore: true */ prismjs);
    const { Prism } = window as any;
    const codelang = langAliases[this.codelang] || this.codelang;

    const load = (lang: string) =>
      !Prism.languages[lang] &&
      import(/* @vite-ignore */ /* webpackIgnore: true */ `${prismjs}/components/prism-${lang}.min.js`);

    const loadPromises = ([] as string[]).concat(langDependencies[codelang] || []).map(load);
    await Promise.allSettled(loadPromises);
    await Promise.allSettled([load(codelang)]);

    const htmlStr = Prism.languages[codelang]
      ? Prism.highlight(this.textContent || '', Prism.languages[codelang], codelang)
      : this.innerHTML;

    this.#codeRef.value.innerHTML = this.#getParts(htmlStr);
  };

  render() {
    return html`
      ${
        this.highlight
          ? this.#getRanges(this.highlight).map(
              ([start, end]) => html`
              <span
                class="highlight"
                style=${styleMap({
                  top: `${(start - 1) * lineHeight + padding}em`,
                  height: `${(end - start + 1) * lineHeight}em`,
                })}
              ></span>
            `,
            )
          : ''
      }
      <code ${this.#codeRef} class="code">${this.#getParts(this.textContent || '')}</code>
    `;
  }
}
