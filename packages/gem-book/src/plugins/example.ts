import type { TemplateResult } from '@mantou/gem/';

import type { GemBookElement } from '../element';

type State = {
  loading: boolean;
  error?: any;
  code?: TemplateResult[];
  textContentIsProps?: boolean;
  elements?: HTMLElement[];
};

type PropValue = string | number | boolean | Record<string, unknown>;

type Props = Record<string, PropValue>;

const { GemBookPluginElement } = (await customElements.whenDefined('gem-book')) as typeof GemBookElement;
const { Gem, theme, icons } = GemBookPluginElement;
const { html, customElement, attribute, createCSSSheet, css, adoptedStyle, styleMap, shadow, createState, mounted } =
  Gem;

const styles = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: flex;
    flex-direction: column;
    margin: 2rem 0px;
    border-radius: ${theme.normalRound};
    overflow: hidden;
  }
  .preview {
    flex-grow: 1;
    background: rgb(from ${theme.textColor} r g b / 0.05);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    padding: 2em 1em;
    gap: 1em;
  }
  .loading {
    color: rgb(from ${theme.textColor} r g b / 0.6);
  }
  .error {
    color: ${theme.cautionColor};
  }
  .preview * {
    max-width: 100%;
  }
  .panel {
    background: rgb(from ${theme.textColor} r g b / 0.03);
    padding: 1em;
  }
  .code {
    display: block;
    font-family: ${theme.codeFont};
    text-align: left;
    white-space: pre;
    tab-size: 2;
    line-height: 1.7;
    hyphens: none;
    overflow: auto;
    overflow-clip-box: content-box;
    box-shadow: none;
    border: none;
    background: transparent;
    scrollbar-width: thin;
  }
  .token {
    color: #757575;
  }
  .tag {
    color: #c9252d;
  }
  .attribute {
    color: #4646c6;
  }
  .inner {
    color: #515151;
  }
`);
@customElement('gbp-example')
@adoptedStyle(styles)
@shadow()
class _GbpExampleElement extends GemBookPluginElement {
  @attribute name: string;
  @attribute src: string;
  @attribute html: string;
  @attribute props: string;
  @attribute direction: 'row' | 'column';

  get #direction() {
    return this.direction || 'row';
  }

  #state = createState<State>({
    loading: true,
  });

  #isFunction(value: PropValue) {
    return /^\((\w|,|\s)*\)\s*=>/.test(String(value));
  }

  #getIcon(value: PropValue) {
    return String(value).startsWith('icons.') ? String(value).split('.') : undefined;
  }

  #parseValue(value: PropValue) {
    return JSON.parse(JSON.stringify({ value }), (_, v) => {
      if (typeof v !== 'string') return v;
      const isIcon = this.#getIcon(v);
      return isIcon ? icons[isIcon[1] as keyof typeof icons] : this.#isFunction(v) ? eval(String(v)) : v;
    }).value;
  }

  #renderElement = (props: Props) => {
    const tag = (props.tagName as string) || this.name;
    if (!tag) throw new Error('missing tag name');
    const ele = tag.includes('-') ? new (customElements.get(tag)!)() : document.createElement(tag);
    if (props) {
      Object.entries(props).forEach(([key, value]) => {
        if (key === 'innerHTML') return (ele.innerHTML = String(value));
        if (key === 'tagName') return;
        if (key.startsWith('@')) {
          ele.addEventListener(key.slice(1), eval(String(value)));
        } else if (key.startsWith('?')) {
          (ele as any)[key.slice(1)] = true;
        } else if (key.startsWith('.')) {
          (ele as any)[key.slice(1)] = this.#parseValue(value);
        } else {
          (ele as any)[key] = this.#parseValue(value);
        }
      });
    }
    return ele;
  };

  #renderToken = (token: string) => {
    return html`<span class="token">${token}</span>`;
  };

  #addIndentation = (str: string | string[], indentation = 2) => {
    return (Array.isArray(str) ? str : str.split('\n')).map((s) => `${' '.repeat(indentation)}${s}`).join('\n');
  };

  #jsonReplace = (value: any, indent: number, getValue: (v: any) => [boolean, string]) => {
    let id = 0;
    const replaceStr = new Map<string, string>();
    const replacer = (key: string, val: any) => {
      const [needReplace, v] = getValue(val);
      // 用来将字符串替换成 v，例如函数
      if (needReplace) {
        const replaceContent = `__${id++}__`;
        replaceStr.set(replaceContent, v);
        return replaceContent;
      }
      return val;
    };
    let result = JSON.stringify(value, replacer, indent);
    replaceStr.forEach((replaceContent, content) => {
      result = result.replace(`"${content}"`, replaceContent);
    });
    return result;
  };

  #jsonStringify = (value: any) => {
    return this.#jsonReplace(value, 2, (val) => {
      const hasIconOrFn =
        typeof val === 'object' && val && Object.values(val).some((e: any) => this.#isFunction(e) || this.#getIcon(e));
      if (hasIconOrFn) {
        return [
          true,
          // 包含 icon/fn 的对象
          this.#jsonReplace(val, JSON.stringify(val).length < 50 ? 0 : 2, (v) => {
            const isIconOrFn = this.#isFunction(v) || this.#getIcon(v);
            return [!!isIconOrFn, ` ${v}`] as const;
          }),
        ] as const;
      }

      const str = JSON.stringify(val);
      if (str.length < 50) {
        return [true, str] as const;
      }

      return [false, ''] as const;
    });
  };

  #renderPropValue = (key: string, value: PropValue, isNewLine: boolean) => {
    if (key === 'innerHTML') return '';
    if (key === 'tagName') return '';
    const icon = this.#getIcon(value);
    const vString = icon
      ? icon.join('.')
      : key.startsWith('@') || this.#isFunction(value)
        ? String(value).includes('customElements.get')
          ? key.replace(/@(\w)/, (_, c) => 'on' + c.toUpperCase())
          : String(value)
        : this.#jsonStringify(value);
    const kString = key.startsWith('@') ? key : `.${key}`;
    const hasMultipleLine = vString.includes('\n');
    const indentValue = hasMultipleLine ? `\n${this.#addIndentation(vString, 4)}\n` : vString;
    return html`${isNewLine ? html`<br />${this.#addIndentation('')}` : ' '}<span class="attribute">${kString}</span
      >${this.#renderToken('=')}${html`\${${this.#renderToken(indentValue)}${hasMultipleLine
        ? this.#addIndentation('')
        : ''}}`}`;
  };

  #renderProps = (props: Props) => {
    const propEntries = Object.entries(props);
    let maxLength = 2;
    if ('innerHTML' in props) maxLength++;
    if ('tagName' in props) maxLength++;
    const isNewLine = propEntries.length > maxLength;
    return html`${propEntries.map(([key, value]) => this.#renderPropValue(key, value, isNewLine))}`;
  };

  #renderTag = (tag: string, props: Props, close?: boolean) => {
    const openToken = '<' + (close ? '/' : '');
    const closeToken = '>';
    return html`${this.#renderToken(openToken)}<span class="tag">${tag}${close ? '' : this.#renderProps(props)}</span
      >${this.#renderToken(closeToken)}`;
  };

  #renderInnerHTML = (props: Props) => {
    if (!props.innerHTML) return ``;
    let text = '';
    if (props.tagName === 'style') {
      const style = new CSSStyleSheet();
      style.replaceSync(props.innerHTML as string);
      text = '\n' + this.#addIndentation([...style.cssRules].map((rule) => rule.cssText)) + '\n';
    } else {
      text = '\n' + this.#addIndentation(String(props.innerHTML)) + '\n';
    }
    return html`<span class="inner">${text}</span>`;
  };

  #renderCode = (props: Props) => {
    const tag = (props.tagName as string) || this.name;
    return html`${this.#renderTag(tag, props)}${this.#renderInnerHTML(props)}${this.#renderTag(tag, props, true)}`;
  };

  #loadResource = (src: string) => {
    return new Promise<null>((res, rej) => {
      /** GEM_BOOK_REPLACE
      if (new URL(src).pathname.startsWith('/duoyun-ui/')) {
        res(import(`../../duoyun-ui/src/elements/${src.split('/').pop()}`));
        return;
      }
      /** GEM_BOOK_REPLACE */
      const script = document.createElement('script');
      script.type = 'module';
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = () => res(null);
      script.onerror = (evt: ErrorEvent) => rej(evt);
      document.body.append(script);
      script.remove();
    });
  };

  @mounted()
  #init = async () => {
    let propsList: Props[] = [];
    let textContentIsProps = false;
    try {
      const obj = JSON.parse(this.textContent!) as Props | Props[];
      propsList = Array.isArray(obj) ? obj : [obj];
      textContentIsProps = true;
    } catch {
      const props = JSON.parse(this.props || '{}');
      if (this.html) props.innerHTML = this.html;
      propsList = [props];
      textContentIsProps = false;
    }
    this.#state({
      textContentIsProps,
      code: propsList?.map((props, index) => html`${index ? '\n' : ''}${this.#renderCode(props)}`),
    });

    try {
      await Promise.all(
        this.src
          .trim()
          .split(/\s*,\s*/)
          .map((src) => this.#loadResource(src)),
      );
      if (this.hidden) return;
      this.#state({
        loading: false,
        error: false,
        elements: propsList.map((props) => this.#renderElement(props)),
      });
    } catch (evt) {
      this.#state({
        error: evt.error || 'Load Error!',
        loading: false,
      });
      this.error(evt);
    }
  };

  render = () => {
    const { error, loading, code, elements, textContentIsProps } = this.#state;
    if (this.hidden) return html``;
    const slot = textContentIsProps ? '' : html`<slot></slot>`;
    return html`
      <div class="preview" style=${styleMap({ flexDirection: this.#direction })}>
        ${error
          ? html`<div class="error">${error}</div>`
          : loading
            ? html`<div class="loading">Example Loading...</div>`
            : html`${elements}${slot}`}
      </div>
      <div class="panel">
        <div class="code">${code}</div>
      </div>
    `;
  };
}
