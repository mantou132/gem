import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { css } from '@mantou/gem/lib/element';
import { TapToastElement } from '@mantou/tap-ui/elements/toast';

import { theme } from '../lib/theme';

export type { ToastItem, ToastOptions, Type } from '@mantou/tap-ui/elements/toast';

const style = css`
  :host(:where(:not([hidden]))) {
    --item-gap: 1em;
    --item-padding-block: 0.6em;
    --item-icon-height: 1.2em;
    --item-height: calc(var(--item-gap) + var(--item-icon-height) + 2 * var(--item-padding-block));
    top: calc(var(--item-gap) + var(--titlebar-area-height, env(titlebar-area-height, 0px)));
    transform: translateX(-50%);
    font-size: 0.875em;
    max-width: 90%;
    gap: var(--item-gap);
    pointer-events: auto;
  }
  .item {
    background: ${theme.informativeColor};
    border-radius: ${theme.normalRound};
    padding: var(--item-padding-block) 0.8em;
    line-height: 1;
    animation-name: dy-toast-show;
  }
  .item.removed {
    animation-name: dy-toast-hide;
  }
  @keyframes dy-toast-show {
    from {
      margin-block-start: calc(0px - var(--item-height));
      opacity: 0;
      transform: none;
    }
  }
  @keyframes dy-toast-hide {
    to {
      margin-block-start: calc(0px - var(--item-height));
      opacity: 0;
      transform: none;
    }
  }
  .success {
    background: ${theme.positiveColor};
  }
  .warning {
    background: ${theme.noticeColor};
  }
  .error {
    background: ${theme.negativeColor};
  }
  .icon {
    width: var(--item-icon-height);
  }
`;

@customElement('dy-toast')
@adoptedStyle(style)
export class DuoyunToastElement extends TapToastElement {}

export const Toast = DuoyunToastElement;
