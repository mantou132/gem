import { customElement } from '@mantou/gem/lib/decorators';
import type { TemplateResult } from '@mantou/gem/lib/element';
import { html } from '@mantou/gem/lib/element';
import type { ContextMenuOptions } from '@mantou/tap-ui/elements/contextmenu';
import { TapContextmenuElement } from '@mantou/tap-ui/elements/contextmenu';

import { locale } from '../lib/locale';

import './button';

export type { ContextMenuItem, ContextMenuOptions, MenuOrMenuObject } from '@mantou/tap-ui/elements/contextmenu';
export { SEPARATOR } from '@mantou/tap-ui/elements/contextmenu';

@customElement('dy-contextmenu')
export class DuoyunContextmenuElement extends TapContextmenuElement {
  static async confirm(
    text: string | TemplateResult,
    options: ContextMenuOptions & { danger?: boolean; okText?: string | TemplateResult },
  ) {
    return new Promise((res, rej) => {
      const onClick = () => {
        this.close();
        res(null);
      };
      this.open(
        html`
          <style>
            .confirm-button {
              text-align: right;
              margin-top: 2em;
            }
          </style>
          <div class="confirm-text">${text}</div>
          <div class="confirm-button">
            <dy-button @click=${onClick} .color=${options.danger ? 'danger' : 'normal'}>
              ${options.okText || locale.ok}
            </dy-button>
          </div>
        `,
        options,
      ).then(rej);
    });
  }
}

export const ContextMenu = DuoyunContextmenuElement;
