/**
 * TODO: support json
 */
import type { ElementDetail, ExportDetail } from 'gem-analyzer';

import type { Main } from '../element/elements/main';
import type { GemBookElement } from '../element';

const tsMorph = 'https://esm.sh/ts-morph@13.0.3';
const gemAnalyzer = 'https://esm.sh/gem-analyzer';

type State = { elements?: ElementDetail[]; exports?: ExportDetail[]; error?: any };

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { Gem, theme } = GemBookPluginElement;
  const { html, customElement, attribute, numattribute, createCSSSheet, css, adoptedStyle } = Gem;
  const MainElement = customElements.get('gem-book-main') as typeof Main;

  const style = createCSSSheet(css`
    gbp-api table {
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
      this.cacheState(() => [this.name, this.src]);
    }

    state: State = {};

    #parseFile = async (text: string) => {
      const { Project } = (await import(/* webpackIgnore: true */ tsMorph)) as typeof import('ts-morph');
      const { getElements, getExports } =
        // 如何在当前项目使用本地依赖？
        // webpackIgnore.config.github === 'https://github.com/mantou132/gem'
        //   ? require('gem-analyzer')
        //   :
        (await import(/* webpackIgnore: true */ gemAnalyzer)) as typeof import('gem-analyzer');
      const project = new Project({ useInMemoryFileSystem: true });
      const file = project.createSourceFile(this.src, text);
      return { elements: getElements(file), exports: getExports(file) };
    };

    #renderHeader = (headingLevel: number, text: string, name: string) => {
      return `${'#'.repeat(headingLevel + this.#headingLevel - 1)} ${text} {#${`${name}-${text}`.replaceAll(
        ' ',
        '-',
      )}}\n\n`;
    };

    #renderCode = (s = '', deprecated?: boolean) => {
      if (!s) return '';
      const code = `\`${s.replace(/\|/g, '\\|').replace(/\n/g, ' ')}\``;
      return deprecated ? `~~${code}~~` : code;
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
        name,
      } = detail;
      let text = '';

      text += description + '\n\n';
      if (constructorExtendsName) {
        text += `Extends ${this.#renderCode(constructorExtendsName)}\n\n`;
      }

      if (constructorName && constructorParams.length) {
        text += this.#renderHeader(1, `Constructor \`${constructorName}()\``, name);
        text += this.#renderTable(
          constructorParams,
          ['Params', 'Type'].concat(constructorParams.some((e) => e.description) ? 'Description' : []),
          [
            ({ name }) => this.#renderCode(name),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description.replaceAll('\n', '<br>'),
          ],
        );
      }
      if (staticProperties.length) {
        text += this.#renderHeader(1, 'Static Properties', name);
        text += this.#renderTable(
          staticProperties,
          ['Property', 'Type'].concat(constructorParams.some((e) => e.description) ? 'Description' : []),
          [
            ({ name, deprecated }) => this.#renderCode(name, deprecated),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description.replaceAll('\n', '<br>'),
          ],
        );
      }
      if (staticMethods.length) {
        text += this.#renderHeader(1, 'Static Methods', name);
        text += this.#renderTable(
          staticMethods,
          ['Method', 'Type'].concat(constructorParams.some((e) => e.description) ? 'Description' : []),
          [
            ({ name, deprecated }) => this.#renderCode(name, deprecated),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description.replaceAll('\n', '<br>'),
          ],
        );
      }
      if (properties.length) {
        text += this.#renderHeader(1, 'Instance Properties', name);
        text += this.#renderTable(
          properties.filter(({ slot, cssState, part, isRef }) => !slot && !cssState && !part && !isRef),
          ['Property(Attribute)', 'Reactive', 'Type'].concat(
            innerWidth > 600 && constructorParams.some((e) => e.description) ? 'Description' : [],
          ),
          [
            ({ name, attribute, deprecated }) =>
              this.#renderCode(name, deprecated) + (attribute ? `(${this.#renderCode(attribute, deprecated)})` : ''),
            ({ reactive }) => (reactive ? 'Yes' : ''),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description.replaceAll('\n', '<br>'),
          ],
        );
      }

      if (methods.length) {
        text += this.#renderHeader(1, 'Instance Methods', name);
        text += this.#renderTable(
          methods.filter(({ event }) => !event),
          ['Method', 'Type'].concat(constructorParams.some((e) => e.description) ? 'Description' : []),
          [
            ({ name, deprecated }) => this.#renderCode(name, deprecated),
            ({ type }) => this.#renderCode(type),
            ({ description = '' }) => description.replaceAll('\n', '<br>'),
          ],
        );
      }

      text += this.#renderHeader(1, 'Other', name);
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
      return MainElement.parseMarkdown(text);
    };

    #renderExports = (exports: ExportDetail[]) => {
      return MainElement.parseMarkdown(
        this.#renderTable(
          exports.filter(({ kindName }) => kindName === 'FunctionDeclaration' || kindName === 'ClassDeclaration'),
          ['Name', 'Description'],
          [
            ({ name, deprecated }) => this.#renderCode(name, deprecated),
            ({ description = '' }) => description.replaceAll('\n', '<br>'),
          ],
        ),
      );
    };

    render = () => {
      const { elements, exports, error } = this.state;
      if (error) return html`<div class="error">${error}</div>`;
      if (!elements) return html`<div class="loading">API Loading...</div>`;
      const renderElements = this.name ? elements.filter(({ name }) => this.name === name) : elements;
      if (!renderElements.length && exports) return html`${this.#renderExports(exports)}`;
      return html`${renderElements.map(this.#renderElement)}`;
    };

    mounted = () => {
      this.effect(() => {
        if (this.state.elements && !this.state.error && location.hash) {
          this.querySelector(`[id="${decodeURIComponent(location.hash.slice(1))}"]`)?.scrollIntoView({
            block: 'start',
          });
        }
      });
      this.effect(
        async () => {
          const url = this.getRemoteURL(this.src);
          if (!url) return;

          try {
            const resp = await fetch(url);
            if (resp.status === 404) throw new Error(resp.statusText || 'Not Found');
            const text = await resp.text();
            const { elements, exports } = await this.#parseFile(text);
            this.setState({ elements, exports, error: false });
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
