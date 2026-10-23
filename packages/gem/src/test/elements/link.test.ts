import type { GemActiveLinkElement, GemLinkElement } from '../../elements/link';
import { html } from '../../lib/element';
import { history } from '../../lib/history';
import { expect, fixture, nextFrame } from '../utils';

import '../../elements/link';

describe('GemLinkElement', () => {
  it('basic', async () => {
    const ele: GemActiveLinkElement = await fixture(
      html`<gem-active-link pattern="/*" href="/#测试">active-link</gem-active-link>`,
    );
    expect(ele.active).to.equal(true);
  });
  it('basePath', async () => {
    const ele: GemLinkElement = await fixture(html`<gem-link href="/a">a</gem-link>`);
    const getHref = () => new URL(ele.shadowRoot!.querySelector('a')!.href).pathname;
    expect(getHref()).to.equal('/a');
    history.basePath = '/base';
    await nextFrame();
    expect(getHref()).to.equal('/base/a');
    history.basePath = '';
  });
});
