import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

import { DuoyunModalElement, Options } from './modal';

const style = createCSSSheet(css`
  .main {
    padding: 1.2em;
    top: 0;
    left: auto;
    right: 0;
    height: 100%;
    min-width: 30em;
    min-height: none;
    max-height: none;
    border-radius: 0;
  }
  @keyframes showmain {
    0% {
      transform: translate(100%, 0);
    }
    100% {
      transform: translate(0);
    }
  }
`);

/**
 * @customElement dy-drawer
 */
@customElement('dy-drawer')
@adoptedStyle(style)
export class DuoyunDrawerElement extends DuoyunModalElement {
  constructor(options: Options) {
    super(options);
    this.addEventListener('maskclick', () => this.close(null));
  }
}

export const Drawer = DuoyunDrawerElement;
