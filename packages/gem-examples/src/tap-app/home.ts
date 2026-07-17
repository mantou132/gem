import { Stack } from 'tap-ui/elements/stack';
import { contentsContainer } from 'tap-ui/lib/styles';

import 'tap-ui/elements/cell';
import 'tap-ui/elements/navbar';
import 'tap-ui/elements/page';

import './detail';
import './profile';

@customElement('tap-app-home')
@adoptedStyle(contentsContainer)
export class TapAppHomeElement extends GemElement {
  #openDetail = () => {
    Stack.push({
      content: html`<tap-app-detail></tap-app-detail>`,
    });
  };

  #openProfile = () => {
    Stack.push({
      content: html`<tap-app-profile></tap-app-profile>`,
    });
  };

  #onRefresh = ({ detail: done }: CustomEvent<() => void>) => {
    setTimeout(done, 1000);
  };

  @template()
  #render = () => html`
    <tap-page refreshable @refresh=${this.#onRefresh}>
      <tap-navbar slot="header" title="Home"></tap-navbar>
      <tap-cell-group
        heading="Explore"
        .items=${[
          { label: 'Detail', action: true, onClick: this.#openDetail },
          { label: 'Profile', action: true, onClick: this.#openProfile },
        ]}
      ></tap-cell-group>
    </tap-page>
  `;
}
