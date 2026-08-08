import { Stack } from 'tap-ui/elements/stack';
import { contentsContainer } from 'tap-ui/lib/styles';

@customElement('t-settings')
@adoptedStyle(contentsContainer)
export class TSettingsElement extends GemElement {
  #state = createState({ notifications: true, darkMode: false });

  #openAbout = () => {
    Stack.push({
      content: html`<t-about></t-about>`,
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

@customElement('t-about')
@adoptedStyle(contentsContainer)
export class TAboutElement extends GemElement {
  @template()
  #render = () => html`
    <tap-page>
      <tap-navbar slot="header" title="About" back @backclick=${() => Stack.close()}></tap-navbar>
      <tap-content>Tap App Demo · gem-examples</tap-content>
    </tap-page>
  `;
}
