import { Dialog } from 'tap-ui/elements/dialog';
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
  #state = createState({ dialogResult: '' });

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

  #openConfirm = async () => {
    try {
      await Dialog.confirm('Delete this item? This cannot be undone.', {
        header: 'Confirm',
        dangerDefaultOkBtn: true,
        okText: 'Delete',
      });
      this.#state({ dialogResult: 'Confirmed' });
    } catch {
      this.#state({ dialogResult: 'Cancelled' });
    }
  };

  #openDialog = async () => {
    try {
      await Dialog.open({
        header: 'Tap Dialog',
        body: 'Imperative Dialog.open with header and body.',
        maskClosable: true,
      });
      this.#state({ dialogResult: 'OK' });
    } catch {
      this.#state({ dialogResult: 'Closed' });
    }
  };

  #openAlert = async () => {
    try {
      await Dialog.open({
        header: 'Notice',
        body: 'Alert-style dialog with only an OK button.',
        disableDefaultCancelBtn: true,
        okText: 'Got it',
      });
      this.#state({ dialogResult: 'Acknowledged' });
    } catch {
      this.#state({ dialogResult: 'Closed' });
    }
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
      <tap-cell-group
        heading="Dialog"
        .items=${[
          { label: 'Confirm', description: 'Danger OK', action: true, onClick: this.#openConfirm },
          { label: 'Open', description: 'Mask closable', action: true, onClick: this.#openDialog },
          { label: 'Alert', description: 'OK only', action: true, onClick: this.#openAlert },
          {
            label: 'Last result',
            description: this.#state.dialogResult || '—',
          },
        ]}
      ></tap-cell-group>
    </tap-page>
  `;
}
