import { createDecoratorTheme } from '@mantou/gem/helper/theme';
import { adoptedStyle, attribute, customElement, shadow, slot } from '@mantou/gem/lib/decorators';
import { css, GemElement } from '@mantou/gem/lib/element';

import { getStatusColor } from './status-light';

const elementTheme = createDecoratorTheme({ color: '' });

const style = css`
  :host {
    margin-block: 0.2em;
    font-size: 0.875em;
    line-height: 1.5;
    color: ${elementTheme.color};
  }
`;

@customElement('dy-help-text')
@adoptedStyle(style)
@shadow()
export class DuoyunHelpTextElement extends GemElement {
  @slot static unnamed: string;

  @attribute status: 'default' | 'neutral' | 'positive' | 'negative';

  get #status() {
    return this.status || 'neutral';
  }

  @elementTheme()
  #theme = () => ({ color: getStatusColor(this.#status) });
}
