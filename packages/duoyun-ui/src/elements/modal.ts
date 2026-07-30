import { mediaQuery } from '@mantou/gem/helper/mediaquery';
import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { css } from '@mantou/gem/lib/element';
import type { DialogOpenOptions, DialogOptions } from 'tap-ui/elements/dialog';
import { TapDialogElement } from 'tap-ui/elements/dialog';

export type ModalOptions = DialogOptions;
export type ModalOpenOptions<T> = DialogOpenOptions<T>;

const style = css`
  :host {
    view-transition-name: dy-modal;
  }
  .header,
  .body {
    text-align: start;
  }
  .footer {
    margin-top: 1.5em;

    * {
      width: auto;
      flex-grow: 0;
    }
  }
  .footer,
  slot[name='footer']::slotted(*) {
    justify-content: flex-end;
  }
  @media ${mediaQuery.PHONE} {
    .main {
      max-width: 100%;
      max-height: 100%;
      width: 100%;
      height: 100%;
    }
  }
`;

@customElement('dy-modal')
@adoptedStyle(style)
export class DuoyunModalElement extends TapDialogElement {}

export const Modal = DuoyunModalElement;
