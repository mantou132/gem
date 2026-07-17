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

  @template()
  #render = () => html`
    <tap-page>
      <tap-navbar slot="header" title="Settings"></tap-navbar>
      <tap-cell-group
        heading="General"
        .items=${[
          {
            label: 'Notifications',
            checked: this.#state.notifications,
            onChange: (checked: boolean) => this.#state({ notifications: checked }),
          },
          {
            label: 'Dark Mode',
            checked: this.#state.darkMode,
            onChange: (checked: boolean) => this.#state({ darkMode: checked }),
          },
        ]}
      ></tap-cell-group>
      <tap-cell-group
        heading="About"
        .items=${[{ label: 'Version', description: '1.0.0', action: true, onClick: this.#openAbout }]}
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
