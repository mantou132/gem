import { adoptedStyle, customElement, template } from '@mantou/gem/lib/decorators';
import { createState, GemElement, html } from '@mantou/gem/lib/element';
import { ActionSheet } from '@mantou/tap-ui/elements/action-sheet';
import { Dialog } from '@mantou/tap-ui/elements/dialog';
import { Sheet } from '@mantou/tap-ui/elements/sheet';
import { Stack } from '@mantou/tap-ui/elements/stack';
import { icons } from '@mantou/tap-ui/lib/icons';
import { contentsContainer } from '@mantou/tap-ui/lib/styles';

import './detail';
import './profile';

@customElement('t-home')
@adoptedStyle(contentsContainer)
export class THomeElement extends GemElement {
  #state = createState({ actionResult: '', dialogResult: '', sheetResult: '' });

  #openDetail = () => {
    Stack.push({
      content: html`<t-detail></t-detail>`,
    });
  };

  #openProfile = () => {
    Stack.push({
      content: html`<t-profile></t-profile>`,
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

  #openActionSheet = async () => {
    const action = await ActionSheet.open({
      title: 'Document actions',
      description: 'Choose what to do with Quarterly report.pdf',
      groups: [
        {
          actions: [
            { label: 'Share', value: 'share' },
            { label: 'Duplicate', value: 'duplicate' },
          ],
        },
        {
          label: 'This action cannot be undone',
          actions: [{ label: 'Delete', value: 'delete', danger: true }],
        },
      ],
    });
    this.#state({ actionResult: action ? String(action.value) : 'Cancelled' });
  };

  #openGridActionSheet = async () => {
    const action = await ActionSheet.open({
      title: 'Share document',
      description: 'Choose where to send Quarterly report.pdf',
      mode: 'grid',
      actions: [
        { label: 'Open', value: 'open', icon: icons.outward },
        { label: 'Copy', value: 'copy', icon: icons.copy },
        { label: 'Favorite', value: 'favorite', icon: icons.star },
        { label: 'Info', value: 'info', icon: icons.info },
        { label: 'Delete', value: 'delete', icon: icons.delete, danger: true },
        { label: 'More', value: 'more', icon: icons.more },
      ],
    });
    this.#state({ actionResult: action ? String(action.value) : 'Cancelled' });
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
        heading="Action Sheet"
        .items=${[
          { label: 'Buttons', description: 'Grouped actions', action: true, onClick: this.#openActionSheet },
          { label: 'Grid', description: 'Icon actions', action: true, onClick: this.#openGridActionSheet },
          { label: 'Last result', description: this.#state.actionResult || '-' },
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
