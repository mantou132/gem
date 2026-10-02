import { adoptedStyle, customElement, light, property, template } from '@mantou/gem/lib/decorators';
import { css, GemElement, html } from '@mantou/gem/lib/element';

import type { CellItem } from '../elements/cell';

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
// 条目可传入模板，需要能被调用方样式化
@light({ penetrable: true })
export class TapPatSettingsElement extends GemElement {
  @property groups?: SettingsGroup[];

  @template()
  #content = () => {
    return html`
      ${(this.groups || []).map(
        (group) => html`
          <tap-cell-group heading=${group.heading || ''} .items=${[...group.items]}></tap-cell-group>
        `,
      )}
    `;
  };
}
