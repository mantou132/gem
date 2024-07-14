import type { GemBookElement } from '../element';
import type { Pre } from '../element/elements/pre';

type File = {
  element: Pre;
  lang: string;
  filename: string;
  status: 'active' | 'hidden' | '';
  code: '';
};

type State = {
  files: File[];
  copyEnd: boolean;
};

customElements.whenDefined('gem-book').then(({ GemBookPluginElement }: typeof GemBookElement) => {
  const { Gem, theme, icons } = GemBookPluginElement;
  const { html, customElement, adoptedStyle, css, createCSSSheet, classMap, shadow } = Gem;

  const style = createCSSSheet(css`
    :host {
      display: block;
      border-radius: ${theme.normalRound};
      margin: 2rem 0px;
      overflow: hidden;
    }
    .header {
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
      padding-inline-end: 0.5em;
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
      margin: 0 !important;
      border-radius: 0 !important;
    }
  `);

  @customElement('gbp-code-group')
  @adoptedStyle(style)
  @shadow()
  class _GbpCodeGroupElement extends GemBookPluginElement<State> {
    constructor() {
      super();
      this.cacheState(() => [this.textContent]);
    }

    state: State = {
      files: [],
      copyEnd: false,
    };

    #getCurrentFile = () => {
      const { files } = this.state;
      return files.find(({ status }) => status === 'active') || files.find(({ status }) => status === '');
    };

    #parseContents = () => {
      return [...this.querySelectorAll<Pre>('gem-book-pre')].map((element) => {
        const filename = element.getAttribute('filename') || '';
        element.dataset.filename = filename;
        element.setAttribute('headless', '');
        return {
          element,
          filename,
          code: element.textContent,
          lang: element.getAttribute('codelang') || '',
          status: element.getAttribute('status') || '',
        } as File;
      });
    };

    #onClickTab = (ele: Pre) => {
      this.setState({
        files: this.state.files.map((file) => {
          const status = file.element === ele ? 'active' : '';
          file.element.status = status;
          return { ...file, status };
        }),
      });
    };

    #onCopy = async () => {
      await navigator.clipboard.writeText(this.#getCurrentFile()?.code || '');
      this.setState({ copyEnd: true });
      setTimeout(() => this.setState({ copyEnd: false }), 1000);
    };

    willMount = () => {
      this.setState({ files: this.#parseContents() });
    };

    render = () => {
      const { files, copyEnd } = this.state;
      if (!files.length) return;
      const currentFile = this.#getCurrentFile();

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
            <gem-use class="btn" .element=${copyEnd ? icons.check : icons.copy} @click=${this.#onCopy}></gem-use>
          </div>
        </div>
        <slot></slot>
        <style>
          ::slotted(:not([data-filename='${currentFile?.filename}'])) {
            display: none;
          }
        </style>
      `;
    };
  }
});
