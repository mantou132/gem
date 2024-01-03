import { fixture, expect } from '@open-wc/testing';

import { html } from '../../lib/element';
import type { GemActiveLinkElement } from '../../elements/link';

import '../../elements/link';

describe('GemTitleElement', () => {
  it('basic', async () => {
    const ele: GemActiveLinkElement = await fixture(
      html`<gem-active-link pattern="/*" href="/#测试">active-link</gem-active-link>`,
    );
    expect(ele.active).to.equal(true);
  });
});
