import type { CellItem } from 'tap-ui/elements/cell';
import { Stack } from 'tap-ui/elements/stack';
import { contentsContainer } from 'tap-ui/lib/styles';

import 'tap-ui/elements/cell';
import 'tap-ui/elements/navbar';
import 'tap-ui/elements/page';

@customElement('tap-app-settings')
@adoptedStyle(contentsContainer)
export class TapAppSettingsElement extends GemElement {
  #state = createState({ notifications: true, darkMode: false });

  #openAbout = () => {
    Stack.push({
      content: html`<tap-app-about></tap-app-about>`,
    });
  };

  #onGeneralChange = ({ detail }: CustomEvent<{ item: CellItem; checked: boolean }>) => {
    if (detail.item.label === 'Notifications') {
      this.#state({ notifications: detail.checked });
    }
    if (detail.item.label === 'Dark Mode') {
      this.#state({ darkMode: detail.checked });
    }
  };

  #onAboutClick = ({ detail }: CustomEvent<CellItem>) => {
    if (detail.label === 'Version') this.#openAbout();
  };

  @template()
  #render = () => html`
    <tap-page>
      <tap-navbar slot="header" title="Settings"></tap-navbar>
      <tap-cell-group
        heading="General"
        .items=${[
          { label: 'Notifications', checked: this.#state.notifications },
          { label: 'Dark Mode', checked: this.#state.darkMode },
        ]}
        @change=${this.#onGeneralChange}
      ></tap-cell-group>
      <tap-cell-group
        heading="About"
        .items=${[{ label: 'Version', description: '1.0.0', action: true }]}
        @itemclick=${this.#onAboutClick}
      ></tap-cell-group>
    </tap-page>
  `;
}

@customElement('tap-app-about')
@adoptedStyle(contentsContainer)
class TapAppAboutElement extends GemElement {
  @template()
  #render = () => html`
    <tap-page>
      <tap-navbar slot="header" title="About" back @backclick=${() => Stack.close()}></tap-navbar>
      <p style="padding:1em;line-height:1.6">Tap App Demo · gem-examples</p>
    </tap-page>
  `;
}
