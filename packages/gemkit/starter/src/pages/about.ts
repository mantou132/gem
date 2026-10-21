import { GemElement, html, template } from '@mantou/gem';
import { page } from '@mantou/gemkit';

@page('About')
export default class AboutPage extends GemElement {
  @template()
  #content = () => html`
    <h1>About</h1>
    <p>Each file in <code>src/pages</code> is a route.</p>
  `;
}
