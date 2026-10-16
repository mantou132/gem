import type { GemTitleElement } from '../../elements/title';
import { html } from '../../lib/element';
import { expect, fixture, nextFrame } from '../utils';

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

    // 只改变 hash 时保持标题，不重复添加前缀
    location.hash = '#a';
    await nextFrame();
    await nextFrame();
    expect(document.title).to.equal('prefix-Page');
    expect(ele.shadowRoot!.textContent).to.equal('Page');
  });
});
