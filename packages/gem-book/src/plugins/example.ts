import type { GemBookElement } from '../element';

type State = {
  loading: boolean;
  error?: any;
};

type PropValue = string | number | boolean;

type Props = Record<string, PropValue>;

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { theme, icons } = GemBookPluginElement;
  const { html, customElement, attribute, createCSSSheet, css, adoptedStyle, styleMap } = GemBookPluginElement.Gem;

  const style = createCSSSheet(css`
    :host {
      display: flex;
      flex-direction: column;
      margin-block-end: 1em;
    }
    .preview {
      flex-grow: 1;
      background: rgba(${theme.textColorRGB}, 0.05);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      padding: 2em 1em;
      gap: 1em;
    }
    .loading {
      opacity: 0.5;
    }
    .error {
      color: ${theme.cautionColor};
    }
    .preview * {
      max-width: 100%;
    }
    .panel {
      background: rgba(${theme.textColorRGB}, 0.03);
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
  `);
  @customElement('gbp-example')
  @adoptedStyle(style)
  class _GbpExampleElement extends GemBookPluginElement<State> {
    @attribute name: string;
    @attribute src: string;
    @attribute html: string;
    @attribute props: string;
    @attribute direction: 'row' | 'column';

    get #direction() {
      return this.direction || 'row';
    }

    state: State = {
      loading: true,
    };

    #isFunction(value: string | number | boolean) {
      return /^\((\w|,|\s)*\)\s*=>/.test(String(value));
    }

    #getIcon(value: string | number | boolean) {
      return String(value).startsWith('icons.') ? String(value).split('.') : undefined;
    }

    #renderElement = (props: Props) => {
      const Cls = customElements.get(this.name);
      if (!Cls) return html``;
      const ele = new Cls();
      if (props) {
        Object.entries(props).forEach(([key, value]) => {
          const isIcon = this.#getIcon(value);
          if (key.startsWith('@')) {
            ele.addEventListener(key.slice(1), eval(String(value)));
          } else if (key.startsWith('?')) {
            (ele as any)[key.slice(1)] = true;
          } else if (key.startsWith('.')) {
            (ele as any)[key.slice(1)] = isIcon
              ? icons[isIcon[1] as keyof typeof icons]
              : this.#isFunction(value)
                ? eval(String(value))
                : JSON.parse(String(value));
          } else {
            (ele as any)[key] = isIcon
              ? icons[isIcon[1] as keyof typeof icons]
              : this.#isFunction(value)
                ? eval(String(value))
                : value;
          }
        });
      }
      return ele;
    };

    #renderToken = (token: string) => {
      return html`<span class="token">${token}</span>`;
    };

    #addIndentation = (str: string, indentation = 2) => {
      return str
        .split('\n')
        .map((s) => `${' '.repeat(indentation)}${s}`)
        .join('\n');
    };

    #jsonStringify = (value: any) => {
      let id = 0;
      const replaceStr = new Map<string, string>();
      const replacer = (_: string, val: any) => {
        const str = JSON.stringify(val);
        if (str.length < 50) {
          const key = `__${id++}__`;
          replaceStr.set(key, str);
          return key;
        }
        return val;
      };
      let result = JSON.stringify(value, replacer, 2);
      replaceStr.forEach((str, key) => {
        result = result.replace(`"${key}"`, str);
      });
      return result;
    };

    #renderPropValue = (key: string, value: PropValue, isNewLine: boolean) => {
      if (key === 'innerHTML') return '';
      const icon = this.#getIcon(value);
      const vString = icon
        ? icon.join('.')
        : key.startsWith('@') || this.#isFunction(value)
          ? String(value)
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
      const isNewLine = propEntries.length > ('innerHTML' in props ? 3 : 2);
      return html`${propEntries.map(([key, value]) => this.#renderPropValue(key, value, isNewLine))}`;
    };

    #renderTag = (tag: string, props: Props, close?: boolean) => {
      const openToken = '<' + (close ? '/' : '');
      const closeToken = '>';
      return html`${this.#renderToken(openToken)}<span class="tag">${tag}${close ? '' : this.#renderProps(props)}</span
        >${this.#renderToken(closeToken)}`;
    };

    #renderInnerHTML = (props: Props) => {
      if (!props.innerHTML) return html``;
      return `\n${this.#addIndentation(String(props.innerHTML))}\n`;
    };

    #renderCode = (props: Props) => {
      return html`${this.#renderTag(this.name, props)}${this.#renderInnerHTML(props)}${this.#renderTag(
        this.name,
        props,
        true,
      )}`;
    };

    #loadResource = (src: string) => {
      return new Promise<null>((res, rej) => {
        /**
         * hack from duoyun-ui
         * @link packages/duoyun-ui/scripts/hack-gbp-example.js
         */
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

    #propsList: Props[] = [];
    #textContentIsProps = false;
    willMount = () => {
      this.memo(() => {
        try {
          const obj = JSON.parse(this.textContent!) as Props | Props[];
          this.#propsList = Array.isArray(obj) ? obj : [obj];
          this.#textContentIsProps = true;
        } catch {
          const props = JSON.parse(this.props || '{}');
          if (this.html) props.innerHTML = this.html;
          this.#propsList = [props];
          this.#textContentIsProps = false;
        }
      });
    };

    mounted = () => {
      Promise.all(this.src.split(',').map((src) => this.#loadResource(src)))
        .then(() => {
          this.setState({ loading: false, error: false });
        })
        .catch((evt: ErrorEvent) => {
          this.setState({ error: evt.error || 'Load Error!', loading: false });
          this.error(evt);
        });
    };

    render = () => {
      const { error, loading } = this.state;
      const code = this.#propsList.map((props, index) => html`${index ? '\n' : ''}${this.#renderCode(props)}`);
      const slot = this.#textContentIsProps ? '' : html`<slot></slot>`;
      return html`
        <div class="preview" style=${styleMap({ flexDirection: this.#direction })}>
          ${error
            ? html`<div class="error">${error}</div>`
            : loading
              ? html`<div class="loading">Example Loading...</div>`
              : html`${this.#propsList.map((props) => this.#renderElement(props))}${slot}`}
        </div>
        <div class="panel">
          <div class="code">${code}</div>
        </div>
      `;
    };
  }
});
