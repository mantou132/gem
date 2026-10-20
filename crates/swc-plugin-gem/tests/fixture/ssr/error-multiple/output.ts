// @ts-nocheck
import { customElement, GemElement } from '@mantou/gem';
import { lazy, server } from '@mantou/gemkit';
@customElement('app-counter')
@server()
@lazy()
export class AppCounterElement extends GemElement {
}
