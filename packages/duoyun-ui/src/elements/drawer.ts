import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { createCSSSheet } from '@mantou/gem/lib/element';
import { css } from '@mantou/gem/lib/utils';

import { slideInLeft, slideOutRight } from '../lib/animations';

import type { ModalOptions } from './modal';
import { DuoyunModalElement } from './modal';

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
    min-height: 0;
    max-height: none;
    border-radius: 0;
  }
`);

/**
 * @customElement dy-drawer
 */
@customElement('dy-drawer')
@adoptedStyle(style)
export class DuoyunDrawerElement extends DuoyunModalElement {
  constructor(options: ModalOptions = {}) {
    super(options);
    this.addEventListener('maskclick', () => this.close(null));
    this.openAnimation = slideInLeft;
    this.closeAnimation = slideOutRight;
  }
}

export const Drawer = DuoyunDrawerElement;
