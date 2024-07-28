import { adoptedStyle, customElement, attribute } from '@mantou/gem/lib/decorators';
import { GemElement, createCSSSheet } from '@mantou/gem/lib/element';
import { css } from '@mantou/gem/lib/utils';

const style = createCSSSheet(css`
  :where(:scope:not([hidden])) {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4em;
  }
  :where(:scope[orientation='vertical']) {
    flex-direction: column;
  }
  :where(:scope[size='small']) {
    gap: 0.2em;
  }
  :where(:scope[size='large']) {
    gap: 0.8em;
  }
`);

/**
 * @customElement dy-space
 * @attr size
 */
@customElement('dy-space')
@adoptedStyle(style)
export class DuoyunSpaceElement extends GemElement {
  @attribute size: 'normal' | 'small' | 'large';
  @attribute orientation: 'horizontal' | 'vertical';
}
