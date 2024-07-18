import {
  GemElement,
  html,
  render,
  customElement,
  connectStore,
  createCSSSheet,
  css,
  adoptedStyle,
  styleMap,
} from '@mantou/gem';
import { useTheme, getThemeStore, useScopedTheme, useOverrideTheme } from '@mantou/gem/helper/theme';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import '../elements/layout';

const [scopedTheme] = useScopedTheme({
  color: '#456',
  borderColor: '#eee',
});

const [overrideTheme, updateOverrideTheme] = useOverrideTheme(scopedTheme, {
  borderColor: '#f0f',
});

const overrideThemeStore = getThemeStore(overrideTheme);

const [printTheme, updatePrintTheme] = useTheme({
  borderColor: 'yellow',
});

document.onclick = () => {
  updateOverrideTheme({
    borderColor: Math.random() > 0.5 ? 'red' : 'blue',
  });
  updatePrintTheme({
    borderColor: Math.random() > 0.5 ? 'gray' : 'white',
  });
};

const style = createCSSSheet(css`
  div {
    color: ${scopedTheme.color};
    border: 2px solid ${scopedTheme.borderColor};
  }
`);

const printStyle = createCSSSheet(
  mediaQuery.PRINT,
  css`
    div {
      border: 2px solid ${printTheme.borderColor};
    }
  `,
);

@customElement('sub-app')
@adoptedStyle(overrideTheme)
class _Sub extends GemElement {
  render() {
    return html`<div
      style=${styleMap({
        border: `2px solid ${scopedTheme.borderColor}`,
      })}
    >
      sub app
    </div>`;
  }
}

@customElement('app-root')
@connectStore(overrideThemeStore)
@adoptedStyle(scopedTheme)
@adoptedStyle(printStyle)
@adoptedStyle(style)
export class App extends GemElement {
  render() {
    return html`
      <div>overrideThemeStore.borderColor: ${overrideThemeStore.borderColor}</div>
      <sub-app></sub-app>
    `;
  }
}

render(
  html`
    <gem-examples-layout>
      <app-root></app-root>
      <div style=${styleMap({ color: scopedTheme.color })}>outer scope, needn't apply style</div>
    </gem-examples-layout>
  `,
  document.body,
);
