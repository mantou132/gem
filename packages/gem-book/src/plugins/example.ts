import type { GemBookElement } from '../element';

type State = {
  loading: boolean;
  error?: any;
};

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { theme } = GemBookPluginElement;
  const { html, customElement, attribute } = GemBookPluginElement.Gem;
  @customElement('gbp-example')
  class _GbpExampleElement extends GemBookPluginElement<State> {
    @attribute name: string;
    @attribute src: string;
    @attribute html: string;
    @attribute props: string;

    state: State = {
      loading: true,
    };

    #renderElement = () => {
      const Cls = customElements.get(this.name);
      if (!Cls) return html``;
      const ele = new Cls();
      if (this.html) ele.innerHTML = this.html;
      if (this.#props) {
        Object.entries(this.#props).forEach(([key, value]) => {
          if (key.startsWith('@')) {
            ele.addEventListener(key.slice(1), eval(value));
          } else if (key.startsWith('?')) {
            (ele as any)[key.slice(1)] = true;
          } else if (key.startsWith('.')) {
            (ele as any)[key.slice(1)] = JSON.parse(value);
          } else {
            (ele as any)[key] = value;
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

    #renderPropValue = (key: string, value: string, isNewLine: boolean) => {
      const vString = key.startsWith('@') ? value : this.#jsonStringify(value);
      const kString = key.startsWith('@') ? key : `.${key}`;
      const hasMultipleLine = vString.includes('\n');
      const indentValue = hasMultipleLine ? `\n${this.#addIndentation(vString, 4)}\n` : vString;
      return html`${isNewLine ? html`<br />${this.#addIndentation('')}` : ' '}<span class="attribute">${kString}</span
        >${this.#renderToken('=')}${html`\${${this.#renderToken(indentValue)}${hasMultipleLine
          ? this.#addIndentation('')
          : ''}}`}`;
    };

    #renderProps = () => {
      const propEntries = Object.entries(this.#props);
      return html`${propEntries.map(([key, value]) => this.#renderPropValue(key, value, propEntries.length > 2))}`;
    };

    #renderTag = (tag: string, close?: boolean) => {
      const openToken = '<' + (close ? '/' : '');
      const closeToken = '>';
      return html`${this.#renderToken(openToken)}<span class="tag">${tag}${close ? '' : this.#renderProps()}</span
        >${this.#renderToken(closeToken)}`;
    };

    #renderInnerHTML = () => {
      if (!this.html) return html``;
      return `\n${this.#addIndentation(this.html)}\n`;
    };

    #renderCode = () => {
      return html`${this.#renderTag(this.name)}${this.#renderInnerHTML()}${this.#renderTag(this.name, true)}`;
    };

    #props: Record<string, string> = {};
    willMount = () => {
      this.memo(() => {
        this.#props = JSON.parse(this.props || '{}');
      });
    };

    mounted = async () => {
      // hack from duoyun-ui
      const script = document.createElement('script');
      script.type = 'module';
      script.src = this.src;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        this.setState({ loading: false, error: false });
        script.remove();
      };
      script.onerror = (evt: ErrorEvent) => {
        this.setState({ error: evt.error || 'Load Error!', loading: false });
        script.remove();
      };
      document.body.append(script);
    };

    render = () => {
      const { error, loading } = this.state;
      return html`
        <div class="preview">
          ${error
            ? html`<div class="error">${error}</div>`
            : loading
              ? html`<div class="loading">Example Loading...</div>`
              : html`${this.#renderElement()}<slot></slot>`}
        </div>
        <div class="panel">
          <div class="code">${this.#renderCode()}</div>
        </div>
        <style>
          :host {
            display: flex;
            flex-direction: column;
            min-height: 25em;
          }
          .preview {
            flex-grow: 1;
            background: rgba(${theme.textColorRGB}, 0.05);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1em;
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
        </style>
      `;
    };
  }
});
