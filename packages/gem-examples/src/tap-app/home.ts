import type { CellItem } from 'tap-ui/elements/cell';
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

  #onItemClick = ({ detail }: CustomEvent<CellItem>) => {
    if (detail.label === 'Detail') this.#openDetail();
    if (detail.label === 'Profile') this.#openProfile();
  };

  @template()
  #render = () => html`
    <tap-page>
      <tap-navbar slot="header" title="Home"></tap-navbar>
      <tap-cell-group
        heading="Explore"
        .items=${[
          { label: 'Detail', action: true },
          { label: 'Profile', action: true },
        ]}
        @itemclick=${this.#onItemClick}
      ></tap-cell-group>
    </tap-page>
  `;
}
