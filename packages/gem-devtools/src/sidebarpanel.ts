import { devtools } from 'webextension-polyfill';
import { customElement, GemElement, html, render, SheetToken } from '@mantou/gem';

import { getSelectedGem } from './get-gem';
import { changeStore, PanelStore, Path } from './store';
import { theme } from './theme';

import './elements/panel';

/**
 * execution script in page
 * @param func A function that can be converted into a string and does not rely on external variables
 * @param args Array serializable using JSON
 */
async function execution(func: (...rest: any) => any, args: any[]) {
  const [data, error] = await devtools.inspectedWindow.eval(
    `(${func.toString()}).apply(null, ${JSON.stringify(args)})`,
  );
  if (error) {
    throw error;
  }
  return data;
}

@customElement('devtools-gem-discover')
class GemDiscover extends GemElement {}

async function updateElementProperties() {
  const data = await execution(getSelectedGem, [
    new PanelStore(),
    Object.getOwnPropertySymbols(new GemDiscover()).map(String),
  ]);
  changeStore(data);
}

devtools.panels.elements.onSelectionChanged.addListener(updateElementProperties);
updateElementProperties();
setInterval(updateElementProperties, 300);

addEventListener('valueclick', ({ detail }: CustomEvent<Path>) => {
  const inspectValue = (path: Path, token: string) => {
    // [["shadowRoot", ""], "querySelector", "[ref=child-ref]"]
    // 只有 constructor 函数会当成对象读取
    const value = path.reduce((p, c, index) => {
      if (typeof p === 'function' && path[index - 1] !== 'constructor') {
        if (Array.isArray(c)) {
          return p(...c);
        } else {
          return p(c);
        }
      } else {
        if (Array.isArray(c)) {
          return c.reduce((pp, cc) => pp || (cc === '' ? p : p[cc]), undefined);
        } else {
          const value = p[c];
          return typeof value === 'function' && c !== 'constructor' ? value.bind(p) : value;
        }
      }
    }, $0);
    if (value instanceof Element) {
      let element = value;
      if (element instanceof HTMLSlotElement) {
        // 只支持 inspect 第一个分配的元素
        element = element.assignedElements()[0] || value;
      }
      inspect(element);
    } else if (typeof value === 'object') {
      // chrome inspect(object) bug?
      const symbol = Object.getOwnPropertySymbols(value)[0];
      if (symbol && symbol.toString() === token) {
        // stylesheet
        console.log(value[symbol]);
      } else {
        console.log(value);
      }
    } else {
      console.dir(value);
      inspect(value);
    }
  };
  execution(inspectValue, [detail, String(SheetToken)]);
});

render(
  html`
    <style>
      body {
        margin: 0;
        font-family: sans-serif;
        background: rgba(${theme.backgroundColorRGB}, 1);
        color: rgba(${theme.textColorRGB}, 1);
      }
    </style>
    <devtools-panel></devtools-panel>
  `,
  document.body,
);
