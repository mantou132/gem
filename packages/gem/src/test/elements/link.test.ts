import type { GemActiveLinkElement } from '../../elements/link';
import { html } from '../../lib/element';
import { expect, fixture } from '../utils';

import '../../elements/link';

describe('GemLinkElement', () => {
  it('basic', async () => {
    const ele: GemActiveLinkElement = await fixture(
      html`<gem-active-link pattern="/*" href="/#测试">active-link</gem-active-link>`,
    );
    expect(ele.active).to.equal(true);
  });
});
