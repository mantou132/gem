import { adoptedStyle, customElement, attribute } from '@mantou/gem/lib/decorators';
import { GemElement } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

const style = createCSSSheet(css`
  dy-space {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.4em;
  }
  dy-space[size='small'] {
    gap: 0.2em;
  }
  dy-space[size='large'] {
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
  @attribute size: 'nomal' | 'small' | 'large';

  constructor() {
    super({ isLight: true });
  }
}
