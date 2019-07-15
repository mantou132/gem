import { fixture, expect } from '@open-wc/testing';
import { GemElement, html } from '../';

customElements.define(
  'gem-demo',
  class extends GemElement {
    /** @attr */ heading: string;
    static observedAttributes = ['heading'];

    render() {
      return html`
        ${this.heading}
      `;
    }
  },
);

describe('<gem-demo>', () => {
  it('allows property heading to be overwritten', async () => {
    const el = await fixture(html`
      <gem-demo heading="different heading"></gem-demo>
    `);

    expect(el.heading).to.equal('different heading');
  });
});
