// @ts-nocheck
import { customElement, GemElement, html, template } from '@mantou/gem';
import { client } from '@mantou/gemkit';
import 'browser-only-lib';
const saved = localStorage.getItem('editor');
@customElement('app-editor')
@client()
export class AppEditorElement extends GemElement {
    @template()
    #content = ()=>html`<textarea>${saved}</textarea>`;
}
