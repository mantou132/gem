import type { ElementDetail } from 'gem-analyzer';

import type { Main } from '../element/elements/main';
import type { GemBookElement } from '../element';

const tsMorph = 'https://esm.sh/ts-morph@13.0.3';
const gemAnalyzer = 'https://jspm.dev/gem-analyzer@1.6.9';

type State = { elements?: ElementDetail[] };

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { Gem, config, devMode } = GemBookPluginElement;
  const { html, customElement, attribute, numattribute } = Gem;
  const MainElement = customElements.get('gem-book-main') as typeof Main;
  const parser = new MainElement();

  @customElement('gbp-api')
  class _GbpApiElement extends GemBookPluginElement<State> {
    @attribute src: string;
    @numattribute headerLevel: number;

    get #headerLevel() {
      return this.headerLevel || 1;
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
      const project = new Project({ useInMemoryFileSystem: true });
      const file = project.createSourceFile(this.src, text);
      return getElements(file);
    };

    #renderHeader = (level: number) => {
      return '#'.repeat(level + (this.#headerLevel - 1));
    };

    #renderCode = (s?: string) => {
      return s ? `\`${s.replace(/\|/g, '\\|')}\`` : '';
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
        name,
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
      if (!this.closestElement(MainElement)?.shadowRoot?.querySelector('h1')) {
        text = `${this.#renderHeader(1)} ${this.#renderCode(`<${name}>`)}` + '\n\n';
      }

      text += description + '\n\n';
      if (constructorExtendsName) {
        text += `Extends ${this.#renderCode(constructorExtendsName)}\n\n`;
      }

      if (constructorName && constructorParams.length) {
        text += `${this.#renderHeader(2)} Constructor \`${constructorName}()\`\n\n`;
        text += this.#renderTable(
          constructorParams,
          ['Params', 'Type', 'Description'],
          [
            ({ name }) => this.#renderCode(name),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description,
          ],
        );
      }
      if (staticProperties.length) {
        text += `${this.#renderHeader(2)} Static Properties\n\n`;
        text += this.#renderTable(
          staticProperties,
          ['Property', 'Type', 'Description'],
          [
            ({ name }) => this.#renderCode(name),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description,
          ],
        );
      }
      if (staticMethods.length) {
        text += `${this.#renderHeader(2)} Static Methods\n\n`;
        text += this.#renderTable(
          staticMethods,
          ['Method', 'Type', 'Description'],
          [
            ({ name }) => this.#renderCode(name),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description,
          ],
        );
      }
      if (properties.length) {
        text += `${this.#renderHeader(2)} Instance Properties\n\n`;
        text += this.#renderTable(
          properties.filter(({ slot, cssState, part, isRef }) => !slot && !cssState && !part && !isRef),
          ['Property(Attribute)', 'Reactive', 'Type', 'Description'],
          [
            ({ name, attribute }) => this.#renderCode(name) + (attribute ? `(${this.#renderCode(attribute)})` : ''),
            ({ reactive }) => (reactive ? 'Yes' : ''),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description,
          ],
        );
      }

      if (methods.length) {
        text += `${this.#renderHeader(2)} Instance Methods\n\n`;
        text += this.#renderTable(
          methods.filter(({ event }) => !event),
          ['Method', 'Type', 'Description'],
          [
            ({ name }) => this.#renderCode(name),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description,
          ],
        );
      }

      text += `${this.#renderHeader(2)} Other\n\n`;
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
      const { elements } = this.state;
      if (!elements) return html`API loading...`;
      return html`${elements.map(this.#renderElement)}`;
    };

    mounted = () => {
      this.effect(
        async () => {
          const url = this.#getRemoteUrl();
          if (!url) return;

          const text = await (await fetch(url)).text();
          const elements = await this.#parseElements(text);
          this.setState({ elements });
        },
        () => [this.src],
      );
    };
  }
});
