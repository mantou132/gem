import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { DuoyunModalElement, ModalOptions } from './modal';

const style = createCSSSheet(css`
  .dialog {
    top: 0;
    left: auto;
    right: 0;
    height: 100%;
  }
  .main {
    padding: 1.2em;
    min-width: 30em;
    min-height: none;
    max-height: none;
    border-radius: 0;
  }
  @keyframes showDialog {
    from {
      transform: translate(100%, 0);
    }
  }
`);

/**
 * @customElement dy-drawer
 */
@customElement('dy-drawer')
@adoptedStyle(style)
export class DuoyunDrawerElement extends DuoyunModalElement {
  constructor(options: ModalOptions) {
    super(options);
    this.addEventListener('maskclick', () => this.close(null));
  }
}

export const Drawer = DuoyunDrawerElement;
