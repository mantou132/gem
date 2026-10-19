import {
  adoptedStyle,
  attribute,
  createState,
  css,
  customElement,
  GemElement,
  html,
  mounted,
  shadow,
  type TemplateResult,
  template,
} from '@mantou/gem';

import { icons } from '../lib/example-icons';
import { localImports } from '../lib/imports';
import { theme } from '../lib/theme';

type PropValue = string | number | boolean | Record<string, unknown>;

type Props = Record<string, PropValue>;

const style = css`
  :host(:where(:not([hidden]))) {
    display: flex;
    flex-direction: column;
    margin: 2rem 0;
    border-radius: ${theme.normalRound};
    overflow: hidden;
  }
  .preview {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 1em;
    padding: 2em 1em;
    background: rgb(from ${theme.textColor} r g b / 0.05);
    > * {
      max-width: 100%;
    }
  }
  .column {
    flex-direction: column;
  }
  .status {
    color: rgb(from ${theme.textColor} r g b / 0.6);
  }
  .error {
    color: ${theme.cautionColor};
  }
  .code {
    margin: 0;
    padding: 1em 1.25em;
    overflow: auto;
    font: 0.875em / 1.6 ${theme.codeFont};
    tab-size: 2;
    background: rgb(from ${theme.textColor} r g b / 0.03);
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
`;

/** 字符串形式的函数，例如 `"(evt) => console.log(evt)"` */
const isFunction = (value: PropValue) => /^\((\w|,|\s)*\)\s*=>/.test(String(value));

/** `"icons.xxx"` 使用 gem-book 的图标 */
const getIcon = (value: PropValue) => (String(value).startsWith('icons.') ? String(value).split('.') : undefined);

const toFunction = (s: string) => new Function(`return (${s})`)();

const indent = (str: string | string[], size = 2) =>
  (Array.isArray(str) ? str : str.split('\n')).map((s) => `${' '.repeat(size)}${s}`).join('\n');

/** JSON 中的部分值替换成原始内容，例如函数 */
function jsonReplace(value: unknown, space: number, getValue: (v: any) => [boolean, string]) {
  let id = 0;
  const replaced = new Map<string, string>();
  let result = JSON.stringify(
    value,
    (_, val) => {
      const [needReplace, content] = getValue(val);
      if (!needReplace) return val;
      const key = `__${id++}__`;
      replaced.set(key, content);
      return key;
    },
    space,
  );
  replaced.forEach((content, key) => {
    result = result.replace(`"${key}"`, content);
  });
  return result;
}

/** 短的值在一行中显示 */
const stringify = (value: unknown) =>
  jsonReplace(value, 2, (val) => {
    const hasIconOrFn =
      typeof val === 'object' && val && Object.values(val).some((e: any) => isFunction(e) || getIcon(e));
    if (hasIconOrFn) {
      const str = jsonReplace(val, JSON.stringify(val).length < 50 ? 0 : 2, (v) => [
        !!(isFunction(v) || getIcon(v)),
        ` ${v}`,
      ]);
      return [true, str];
    }
    const str = JSON.stringify(val);
    return [str.length < 50, str];
  });

/**
 * 自定义元素的示例，`examples` 是属性的 JSON（数组时显示多个元素），由服务端从子元素的 JSON 代码块中生成
 */
@customElement('gbp-example')
@adoptedStyle(style)
@shadow()
export class GbpExampleElement extends GemElement {
  /** 元素的标签名 */
  @attribute name: string;
  /** 元素的模块地址，多个使用逗号分隔 */
  @attribute src: string;
  @attribute examples: string;
  /** 没有 `examples` 时元素的属性和内容 */
  @attribute props: string;
  @attribute html: string;
  @attribute direction: 'row' | 'column';

  #state = createState({ loading: true, error: '', elements: [] as Element[] });

  get #propsList(): Props[] {
    if (this.examples) {
      const obj = JSON.parse(this.examples) as Props | Props[];
      return Array.isArray(obj) ? obj : [obj];
    }
    const props = JSON.parse(this.props || '{}');
    if (this.html) props.innerHTML = this.html;
    return [props];
  }

  #parseValue = (value: PropValue) =>
    JSON.parse(JSON.stringify({ value }), (_, v) => {
      if (typeof v !== 'string') return v;
      const icon = getIcon(v);
      return icon ? icons[icon[1] as keyof typeof icons] : isFunction(v) ? toFunction(v) : v;
    }).value;

  #createElement = (props: Props) => {
    const tag = (props.tagName as string) || this.name;
    const ele = document.createElement(tag);
    const record = ele as unknown as Record<string, unknown>;
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'tagName') return;
      if (key === 'innerHTML') {
        ele.innerHTML = String(value);
      } else if (key.startsWith('@')) {
        ele.addEventListener(key.slice(1), toFunction(String(value)));
      } else if (key.startsWith('?')) {
        record[key.slice(1)] = true;
      } else {
        record[key.replace(/^\./, '')] = this.#parseValue(value);
      }
    });
    return ele;
  };

  #renderToken = (token: string) => html`<span class="token">${token}</span>`;

  #renderProp = (key: string, value: PropValue, isNewLine: boolean) => {
    if (key === 'innerHTML' || key === 'tagName') return '';
    const icon = getIcon(value);
    const valueStr = icon
      ? icon.join('.')
      : key.startsWith('@') || isFunction(value)
        ? String(value)
        : stringify(value);
    const keyStr = key.startsWith('@') || key === 'style' ? key : `.${key}`;
    const multiline = valueStr.includes('\n');
    const indented = multiline ? `\n${indent(valueStr, 4)}\n` : valueStr;
    return html`${isNewLine ? html`<br />${indent('')}` : ' '}<span class="attribute">${keyStr}</span>${this.#renderToken(
      '=',
    )}\${${this.#renderToken(indented)}${multiline ? indent('') : ''}}`;
  };

  #renderTag = (tag: string, props: Props, close?: boolean): TemplateResult => {
    const entries = Object.entries(props);
    const isNewLine = entries.filter(([key]) => key !== 'innerHTML' && key !== 'tagName').length > 2;
    return html`${this.#renderToken(close ? '</' : '<')}<span class="tag"
        >${tag}${close ? '' : entries.map(([key, value]) => this.#renderProp(key, value, isNewLine))}</span
      >${this.#renderToken('>')}`;
  };

  #renderCode = (props: Props) => {
    const tag = (props.tagName as string) || this.name;
    const inner = props.innerHTML ? `\n${indent(String(props.innerHTML))}\n` : '';
    return html`${this.#renderTag(tag, props)}${inner}${this.#renderTag(tag, props, true)}`;
  };

  // 元素的模块只在客户端加载
  @mounted()
  #load = async () => {
    try {
      await Promise.all(
        this.src
          .split(',')
          .map((src) => src.trim())
          .filter(Boolean)
          // `GEM_BOOK_REPLACE` 时 esm.sh 的模块替换成了本地文件
          .map((src) => localImports.get(src)?.() || import(/* webpackIgnore: true */ src)),
      );
      // 隐藏的示例只用来加载模块
      if (this.hidden) return;
      this.#state({ loading: false, elements: this.#propsList.map(this.#createElement) });
    } catch (err) {
      this.#state({ loading: false, error: String(err) });
    }
  };

  @template()
  #content = () => {
    if (this.hidden) return html``;
    const { loading, error, elements } = this.#state;
    return html`
      <div class=${this.direction === 'column' ? 'preview column' : 'preview'}>
        ${
          error
            ? html`<span class="error">${error}</span>`
            : loading
              ? html`<span class="status">Loading...</span>`
              : elements
        }
      </div>
      <pre class="code">${this.#propsList.map((props, index) => html`${index ? '\n' : ''}${this.#renderCode(props)}`)}</pre>
    `;
  };
}
