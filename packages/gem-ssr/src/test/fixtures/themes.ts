import { adoptedStyle, css, customElement, GemElement, html, template } from '@mantou/gem';
import { createScopedTheme } from '@mantou/gem/helper/theme';

export const theme = createScopedTheme({ textColor: 'red' }, 'app-theme');

const style = css`
  :scope {
    color: ${theme.textColor};
  }
`;

@customElement('app-themed')
@adoptedStyle(theme)
@adoptedStyle(style)
export class DemoThemedElement extends GemElement {
  @template()
  #render = () => html`<b>themed</b>`;
}

export const themed = () => html`<app-themed></app-themed>`;
