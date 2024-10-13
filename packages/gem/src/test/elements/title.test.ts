import { fixture, expect, nextFrame } from '../utils';
import { html } from '../../lib/element';
import type { GemTitleElement } from '../../elements/title';

import '../../elements/title';

describe('GemTitleElement', () => {
  it('basic', async () => {
    const ele: GemTitleElement = await fixture(html`<gem-title>title</gem-title>`);
    await nextFrame();
    expect(document.title).to.equal('title');
    ele.textContent = 'title2';
    await nextFrame();
    expect(document.title).to.equal('title2');

    ele.prefix = 'prefix-';
    await nextFrame();
    expect(document.title).to.equal('prefix-title2');

    history.pushState(null, 'Page', '/');
    await nextFrame();
    expect(document.title).to.equal('prefix-Page');
    expect(ele.shadowRoot!.textContent).to.equal('Page');
  });
});
