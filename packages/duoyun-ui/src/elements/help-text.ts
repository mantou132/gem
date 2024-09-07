import { adoptedStyle, customElement, attribute, slot, shadow } from '@mantou/gem/lib/decorators';
import { GemElement, createCSSSheet } from '@mantou/gem/lib/element';
import { css } from '@mantou/gem/lib/utils';
import { useDecoratorTheme } from '@mantou/gem/helper/theme';

import { getStatusColor } from './status-light';

const [elementTheme, updateTheme] = useDecoratorTheme({ color: '' });

const style = createCSSSheet(css`
  :host {
    margin-block: 0.2em;
    font-size: 0.875em;
    line-height: 1.5;
    color: ${elementTheme.color};
  }
`);

/**
 * @customElement dy-help-text
 * @attr status
 */
@customElement('dy-help-text')
@adoptedStyle(style)
@shadow()
export class DuoyunHelpTextElement extends GemElement {
  @slot static unnamed: string;

  @attribute status: 'default' | 'neutral' | 'positive' | 'negative';

  get #status() {
    return this.status || 'neutral';
  }

  @updateTheme()
  #theme = () => ({ color: getStatusColor(this.#status) });
}
