// @ts-nocheck
import { adoptedStyle, css, customElement, GemElement, html, property, template } from '@mantou/gem';
import { server } from '@mantou/gemkit';
import { marked } from 'marked';
import './side-effect';

const style = css`
  :scope {
    color: red;
  }
`;

const render = (text: string) => marked.parse(text);

export const shared = 1;

@customElement('app-markdown')
@adoptedStyle(style)
@server()
export class AppMarkdownElement extends GemElement {
  @property text?: string;

  @template()
  #content = () => html`${render(this.text || '')}`;
}
