import type { Emitter } from '@mantou/gem/lib/decorators';
import { adoptedStyle, customElement, emitter, property, template } from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';

import type { CellItem } from '../elements/cell';
import { theme } from '../lib/theme';

import '../elements/cell';

export type SettingsItem = CellItem;

export type SettingsGroup = {
  heading?: string;
  items: SettingsItem[];
};

const style = css`
  :scope:where(:not([hidden])) {
    display: block;
    width: 100%;
    padding-block: 0.5em;
  }
`;

@customElement('tap-pat-settings')
@adoptedStyle(style)
export class TapPatSettingsElement extends GemElement {
  @property groups?: SettingsGroup[];

  @emitter itemclick: Emitter<SettingsItem>;
  @emitter change: Emitter<{ item: SettingsItem; checked: boolean }>;

  @template()
  #content = () => {
    return html`
      ${(this.groups || []).map(
        (group) => html`
          <tap-cell-group
            heading=${group.heading || ''}
            .items=${[...group.items]}
            @itemclick=${({ detail }: CustomEvent<SettingsItem>) => this.itemclick(detail)}
            @change=${({ detail }: CustomEvent<{ item: SettingsItem; checked: boolean }>) => this.change(detail)}
          ></tap-cell-group>
        `,
      )}
    `;
  };
}
