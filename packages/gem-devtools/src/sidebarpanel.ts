import { devtools } from 'webextension-polyfill';
import { customElement, GemElement, html, render, SheetToken } from '@mantou/gem';

import { getSelectedGem } from './scripts/get-gem';
import { inspectValue } from './scripts/inspect-value';
import { changeStore, PanelStore, Path } from './store';
import { getDomStat } from './scripts/dom-stat';
import { inspectDom } from './scripts/inspect-ele';
import { theme } from './theme';
import { DomStatInfo } from './elements/statistics';

import './modules/panel';

/**
 * execution script in page
 * @param func A function that can be converted into a string and does not rely on external variables
 * @param args Array serializable using JSON
 */
async function execution<Func extends (...rest: any) => any>(
  func: Func,
  args: Parameters<Func>,
): Promise<ReturnType<Func>> {
  const source = func.toString();
  const [data, errorInfo] = await devtools.inspectedWindow.eval(`(${source}).apply(null, ${JSON.stringify(args)})`);
  if (errorInfo) {
    throw {
      source,
      ...errorInfo,
    };
  }
  return data;
}

@customElement('devtools-gem-discover')
class GemDiscover extends GemElement {}

async function updateElementProperties() {
  const initData = new PanelStore();
  const data = await execution(getSelectedGem, [initData, Object.getOwnPropertySymbols(new GemDiscover()).map(String)]);
  if (data) {
    changeStore(data);
  } else {
    initData.isGemElement = false;
    changeStore(await execution(getDomStat, [initData]));
  }
}

devtools.panels.elements.onSelectionChanged.addListener(() => {
  scrollTo(0, 0);
  updateElementProperties();
});
updateElementProperties();
setInterval(updateElementProperties, 300);

addEventListener('valueclick', ({ detail }: CustomEvent<Path>) => {
  execution(inspectValue, [detail, String(SheetToken)]);
});

addEventListener('inspectdom', ({ detail }: CustomEvent<DomStatInfo>) => {
  execution(inspectDom, [detail]);
});

render(
  html`
    <style>
      body {
        margin: 0;
        font-family: sans-serif;
        background: rgba(${theme.backgroundColorRGB}, 1);
        color: rgba(${theme.textColorRGB}, 1);
        -moz-osx-font-smoothing: grayscale;
        -webkit-font-smoothing: antialiased;
      }
    </style>
    <devtools-panel></devtools-panel>
  `,
  document.body,
);
