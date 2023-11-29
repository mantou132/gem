/**
 * TODO: support json
 */
import type { ElementDetail } from 'gem-analyzer';

import type { Main } from '../element/elements/main';
import type { GemBookElement } from '../element';

const tsMorph = 'https://esm.sh/ts-morph@13.0.3';
const gemAnalyzer = 'https://jspm.dev/gem-analyzer';

type State = { elements?: ElementDetail[]; error?: any };

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { Gem, config, devMode, theme } = GemBookPluginElement;
  const { html, customElement, attribute, numattribute, createCSSSheet, css, adoptedStyle } = Gem;
  const MainElement = customElements.get('gem-book-main') as typeof Main;
  const parser = new MainElement();

  const style = createCSSSheet(css`
    gbp-api table {
      td {
        word-break: break-word;
      }
      tr td:first-of-type {
        white-space: nowrap;
      }
    }
    gbp-api {
      .loading {
        opacity: 0.5;
      }
      .error {
        color: ${theme.cautionColor};
      }
    }
  `);

  @customElement('gbp-api')
  @adoptedStyle(style)
  class _GbpApiElement extends GemBookPluginElement<State> {
    @attribute src: string;
    @attribute name: string;
    @numattribute headinglevel: number;

    get #headingLevel() {
      return this.headinglevel || 3;
    }

    constructor() {
      super({ isLight: true });
    }

    state: State = {};

    #getRemoteUrl = () => {
      if (!this.src) return '';

      let url = this.src;
      if (!/^(https?:)?\/\//.test(this.src)) {
        if (!config.github || !config.sourceBranch) return '';
        const rawOrigin = 'https://raw.githubusercontent.com';
        const repo = new URL(config.github).pathname;
        const src = `${this.src.startsWith('/') ? '' : '/'}${this.src}`;
        const basePath = config.base ? `/${config.base}` : '';
        url = devMode ? `/_assets${src}` : `${rawOrigin}${repo}/${config.sourceBranch}${basePath}${src}`;
      }
      return url;
    };

    #parseElements = async (text: string) => {
      const { Project } = (await import(/* webpackIgnore: true */ tsMorph)) as typeof import('ts-morph');
      const { getElements } = (await import(/* webpackIgnore: true */ gemAnalyzer)) as typeof import('gem-analyzer');
      // const { getElements } = await import('gem-analyzer');
      const project = new Project({ useInMemoryFileSystem: true });
      const file = project.createSourceFile(this.src, text);
      return getElements(file);
    };

    #renderHeader = (headinglevel: number) => {
      return '#'.repeat(headinglevel + this.#headingLevel - 1);
    };

    #renderCode = (s?: string) => {
      return s ? `\`${s.replace(/\|/g, '\\|').replace(/\n/g, ' ')}\`` : '';
    };

    #renderTable = <T>(list: T[], headers: string[], fields: ((data: T) => string)[]) => {
      let text = '';
      text += headers.reduce((p, c, index) => p + `${headers[index]} |`, '|') + '\n';
      text += headers.reduce((p) => p + `--- |`, '|') + '\n';
      text += list.reduce((p, c, dataIndex) => {
        return p + headers.reduce((p, c, index) => p + `${fields[index](list[dataIndex])} |`, '|') + '\n';
      }, '');
      return text;
    };

    #renderElement = (detail: ElementDetail) => {
      const {
        description = '',
        constructorName,
        constructorExtendsName,
        constructorParams,
        staticProperties,
        staticMethods,
        properties,
        methods,
        events,
        cssStates,
        parts,
        slots,
      } = detail;
      let text = '';

      text += description + '\n\n';
      if (constructorExtendsName) {
        text += `Extends ${this.#renderCode(constructorExtendsName)}\n\n`;
      }

      if (constructorName && constructorParams.length) {
        text += `${this.#renderHeader(1)} Constructor \`${constructorName}()\`\n\n`;
        text += this.#renderTable(
          constructorParams,
          ['Params', 'Type'].concat(constructorParams.some((e) => e.description) ? 'Description' : []),
          [
            ({ name }) => this.#renderCode(name),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description,
          ],
        );
      }
      if (staticProperties.length) {
        text += `${this.#renderHeader(1)} Static Properties\n\n`;
        text += this.#renderTable(
          staticProperties,
          ['Property', 'Type'].concat(constructorParams.some((e) => e.description) ? 'Description' : []),
          [
            ({ name }) => this.#renderCode(name),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description,
          ],
        );
      }
      if (staticMethods.length) {
        text += `${this.#renderHeader(1)} Static Methods\n\n`;
        text += this.#renderTable(
          staticMethods,
          ['Method', 'Type'].concat(constructorParams.some((e) => e.description) ? 'Description' : []),
          [
            ({ name }) => this.#renderCode(name),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description,
          ],
        );
      }
      if (properties.length) {
        text += `${this.#renderHeader(1)} Instance Properties\n\n`;
        text += this.#renderTable(
          properties.filter(({ slot, cssState, part, isRef }) => !slot && !cssState && !part && !isRef),
          ['Property(Attribute)', 'Reactive', 'Type'].concat(
            innerWidth > 600 && constructorParams.some((e) => e.description) ? 'Description' : [],
          ),
          [
            ({ name, attribute }) => this.#renderCode(name) + (attribute ? `(${this.#renderCode(attribute)})` : ''),
            ({ reactive }) => (reactive ? 'Yes' : ''),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description,
          ],
        );
      }

      if (methods.length) {
        text += `${this.#renderHeader(1)} Instance Methods\n\n`;
        text += this.#renderTable(
          methods.filter(({ event }) => !event),
          ['Method', 'Type'].concat(constructorParams.some((e) => e.description) ? 'Description' : []),
          [
            ({ name }) => this.#renderCode(name),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description,
          ],
        );
      }

      text += `${this.#renderHeader(1)} Other\n\n`;
      text += this.#renderTable(
        [
          { type: 'Event', value: events },
          { type: 'Slot', value: slots },
          { type: 'Part', value: parts },
          { type: 'CSS State', value: cssStates },
        ],
        ['Type', 'Value'],
        [({ type }) => type, ({ value }) => value.map((e) => this.#renderCode(e)).join(', ')],
      );
      return parser.parseMarkdown(text);
    };

    render = () => {
      const { elements, error } = this.state;
      if (error) return html`<div class="error">${error}</div>`;
      if (!elements) return html`<div class="loading">API Loading...</div>`;
      const renderElements = this.name ? elements.filter(({ name }) => this.name === name) : elements;
      return html`${renderElements.map(this.#renderElement)}`;
    };

    mounted = () => {
      this.effect(
        async () => {
          const url = this.#getRemoteUrl();
          if (!url) return;

          try {
            const resp = await fetch(url);
            if (resp.status === 404) throw new Error(resp.statusText || 'Not Found');
            const text = await resp.text();
            const elements = await this.#parseElements(text);
            this.setState({ elements, error: false });
          } catch (error) {
            this.error(error);
            this.setState({ error });
          }
        },
        () => [this.src],
      );
    };
  }
});
