import { html, render } from '../lib/lit-html';
import { expect } from './utils';

describe('lit-html', () => {
  it('updates an iterable before a removed v-if element', () => {
    const container = document.createElement('div');
    const view = (messages: string[], permissionRequest: boolean) =>
      html`${messages.map((message) => html`<p>${message}</p>`)}<div v-if=${permissionRequest}>Permission request</div>`;

    render(view(['Message 1'], false), container);
    expect(container.textContent?.trim()).to.equal('Message 1');

    expect(() => render(view(['Message 1', 'Message 2'], false), container)).not.to.throw();
    expect(container.textContent?.replace(/\s/g, '')).to.equal('Message1Message2');

    render(view(['Message 1', 'Message 2'], true), container);
    expect(container.textContent?.replace(/\s/g, '')).to.equal('Message1Message2Permissionrequest');
  });
});
