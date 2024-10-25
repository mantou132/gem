import type { ElementDetail, ExportDetail } from 'gem-analyzer';

import type { GemBookElement } from '../element';

const tsMorph = 'https://esm.sh/ts-morph@13.0.3';
const gemAnalyzer = 'https://esm.sh/gem-analyzer';

type State = { elements?: ElementDetail[]; exports?: ExportDetail[]; error?: any };

const { GemBookPluginElement } = (await customElements.whenDefined('gem-book')) as typeof GemBookElement;
const { Gem, theme, Utils } = GemBookPluginElement;
const {
  createState,
  html,
  customElement,
  attribute,
  numattribute,
  createCSSSheet,
  adoptedStyle,
  effect,
  kebabToCamelCase,
  camelToKebabCase,
  light,
} = Gem;

const styles = createCSSSheet`
  table {
    tr td:first-of-type {
      white-space: nowrap;
    }
  }
  .loading {
    color: rgb(from ${theme.textColor} r g b / 0.6);
  }
  .error {
    color: ${theme.cautionColor};
  }
`;

@customElement('gbp-api')
@adoptedStyle(styles)
@light({ penetrable: true })
class _GbpApiElement extends GemBookPluginElement {
  @attribute src: string;
  @attribute name: string;
  @numattribute headinglevel: number;

  get #headingLevel() {
    return this.headinglevel || 3;
  }

  constructor() {
    super();
    this.cacheState(() => [this.name, this.src]);
  }

  state = createState<State>({});

  #parseFile = async (text: string) => {
    const { Project, ts } = (await import(/* webpackIgnore: true */ tsMorph)) as typeof import('ts-morph');
    const { getElements, getExports } =
      /** GEM_BOOK_REPLACE
      (await import('gem-analyzer')) ||
      /** GEM_BOOK_REPLACE */
      (await import(/* webpackIgnore: true */ gemAnalyzer)) as typeof import('gem-analyzer');
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });
    const fileSystem = project.getFileSystem();
    fileSystem.readFile = async (filePath: string) => {
      const url = Utils.getRemoteURL(filePath);
      return (await fetch(url)).text();
    };
    const file = project.createSourceFile(this.src, text);
    return { elements: await getElements(file, project), exports: await getExports(file) };
  };

  #renderHeader = (text: string, extText: string, root?: ElementDetail) => {
    const baseLevel = root?.extend ? 2 : 1;
    const headingLevel = extText === text ? baseLevel - 1 : baseLevel;
    const level = '#'.repeat(headingLevel + this.#headingLevel - 1);
    const title = root?.extend ? `\`${extText}\` ${text}` : text;
    const hash = `${[extText === text ? '' : extText, text]
      .map((e) => kebabToCamelCase(e).replaceAll(' ', ''))
      .map((e) => camelToKebabCase(e).replace('-', ''))
      .filter((e) => e)
      .join('-')}`;
    return `${level} ${title} {#${hash}}\n\n`;
  };

  #renderCode = (s = '', deprecated?: boolean, prefix?: string) => {
    if (!s) return '';
    const code = `\`${[prefix, s]
      .filter((e) => e)
      .join(' ')
      .replace(/\|/g, '\\|')
      .replace(/\n/g, ' ')}\``;
    return deprecated ? `~~${code}~~` : code;
  };

  #renderTable = <T>(list: T[], headers: string[], fields: ((data: T) => string)[]) => {
    let text = '';
    text += headers.reduce((p, c, index) => p + `${headers[index]} |`, '|') + '\n';
    text += headers.reduce((p) => p + `--- |`, '|') + '\n';
    text += list.reduce((prev, c, dataIndex) => {
      return prev + headers.reduce((p, _, index) => p + `${fields[index](list[dataIndex])} |`, '|') + '\n';
    }, '');
    return text;
  };

  #renderElement = (detail: ElementDetail, root = detail): string => {
    const {
      shadow,
      description: eleDescription = '',
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
      extend,
    } = detail;

    let text = '';

    if (root.extend) {
      text += this.#renderHeader(constructorName, constructorName);
    }

    text += eleDescription + '\n\n';
    if (constructorExtendsName) {
      if (shadow) {
        text += `Shadow DOM; `;
      }
      text += `Extends ${this.#renderCode(constructorExtendsName)}\n\n`;
    }

    if (constructorName && constructorParams.length) {
      text += this.#renderHeader(`Constructor \`${constructorName}()\``, constructorName, root);
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
      text += this.#renderHeader('Static Properties', constructorName, root);
      text += this.#renderTable(
        staticProperties,
        ['Property', 'Type'].concat(constructorParams.some((e) => e.description) ? 'Description' : []),
        [
          ({ name, deprecated, getter, setter }) =>
            this.#renderCode(name, deprecated, getter ? 'get' : setter ? 'set' : ''),
          ({ type }) => this.#renderCode(type),
          ({ description = '' }) => description.replaceAll('\n', '<br>'),
        ],
      );
    }
    if (staticMethods.length) {
      text += this.#renderHeader('Static Methods', constructorName, root);
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
      text += this.#renderHeader('Instance Properties', constructorName, root);
      text += this.#renderTable(
        properties.filter(({ slot, cssState, part, isRef }) => !slot && !cssState && !part && !isRef),
        ['Property(Attribute)', 'Reactive', 'Type'].concat(
          innerWidth > 600 && constructorParams.some((e) => e.description) ? 'Description' : [],
        ),
        [
          ({ name, attribute: attr, deprecated, setter, getter }) =>
            this.#renderCode(name, deprecated, getter ? 'get' : setter ? 'set' : '') +
            (attr ? `(${this.#renderCode(attr, deprecated)})` : ''),
          ({ reactive }) => (reactive ? 'Yes' : ''),
          ({ type }) => this.#renderCode(type),
          ({ description = '' }) => description.replaceAll('\n', '<br>'),
        ],
      );
    }

    if (methods.length) {
      text += this.#renderHeader('Instance Methods', constructorName, root);
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

    const otherRows = [
      { type: 'Event', value: events },
      { type: 'Slot', value: slots },
      { type: 'Part', value: parts },
      { type: 'CSS State', value: cssStates },
    ];
    if (otherRows.some(({ value }) => !!value.length)) {
      text += this.#renderHeader('Other', constructorName, root);
      text += this.#renderTable(
        otherRows.filter(({ value }) => !!value.length),
        ['Type', 'Value'],
        [({ type }) => type, ({ value }) => value.map((e) => this.#renderCode(e)).join(', ')],
      );
    }

    if (extend) {
      text += this.#renderElement(extend, detail) + '\n\n';
    }

    return text;
  };

  #renderExports = (exports: ExportDetail[]) => {
    return Utils.parseMarkdown(
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

  @effect()
  #scrollIntoView = () => {
    if (this.state.elements && !this.state.error && location.hash) {
      this.querySelector(`[id="${decodeURIComponent(location.hash.slice(1))}"]`)?.scrollIntoView({
        block: 'start',
      });
    }
  };

  @effect((i) => [i.src])
  #updateState = async () => {
    const url = Utils.getRemoteURL(this.src);
    if (!url) return;

    try {
      const resp = await fetch(url);
      if (resp.status === 404) throw new Error(resp.statusText || 'Not Found');
      const text = await resp.text();
      const { elements, exports } = await this.#parseFile(text);
      this.state({ elements, exports, error: false });
    } catch (error) {
      this.error(error);
      this.state({ error });
    }
  };

  render = () => {
    const { elements, exports, error } = this.state;
    if (error) return html`<div class="error">${error}</div>`;
    if (!elements) return html`<div class="loading">API Loading...</div>`;
    const renderElements = this.name ? elements.filter(({ name }) => this.name === name) : elements;
    if (!renderElements.length && exports) return html`${this.#renderExports(exports)}`;
    return html`${renderElements.map((detail) => Utils.parseMarkdown(this.#renderElement(detail)))}`;
  };
}
