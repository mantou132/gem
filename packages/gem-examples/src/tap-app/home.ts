import { adoptedStyle, customElement, template } from '@mantou/gem/lib/decorators';
import { createState, GemElement, html } from '@mantou/gem/lib/element';
import { Dialog } from 'tap-ui/elements/dialog';
import { Sheet } from 'tap-ui/elements/sheet';
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
  #state = createState({ dialogResult: '', sheetResult: '' });

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

  #openSheet = async () => {
    await Sheet.open({
      header: 'Sheet Modal',
      body: html`
        <p>Bottom sheet with drag handle. Pull down or tap the mask to dismiss.</p>
        <p style="margin-top: 1em; color: inherit; opacity: 0.7">
          Release past 33% height or swipe down quickly to continue the close animation from the current offset.
        </p>
      `,
      maskClosable: true,
    });
    this.#state({ sheetResult: 'Dismissed' });
  };

  #openSheetLong = async () => {
    await Sheet.open({
      header: 'Scrollable',
      body: html`
        ${Array.from(
          { length: 30 },
          (_, i) => html`<p style="margin: 0.5em 0">Row ${i + 1} — content scrolls inside the sheet.</p>`,
        )}
      `,
      maskClosable: true,
    });
    this.#state({ sheetResult: 'Dismissed (long)' });
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
      <tap-cell-group
        heading="Sheet"
        .items=${[
          { label: 'Open', description: 'Drag header or pull body', action: true, onClick: this.#openSheet },
          { label: 'Scrollable', description: 'Pull at top to close', action: true, onClick: this.#openSheetLong },
          {
            label: 'Last result',
            description: this.#state.sheetResult || '—',
          },
        ]}
      ></tap-cell-group>
    </tap-page>
  `;
}
