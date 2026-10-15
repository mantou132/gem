import { customElement, GemElement, html, template } from '@mantou/gem';
import { isServer } from '@mantou/gem/lib/server';

// 服务端和客户端渲染不同的模板，例如依赖了浏览器环境
@customElement('app-mismatch')
export class DemoMismatchElement extends GemElement {
  @template()
  #render = () =>
    html`<div>${isServer ? html`<p>${'server'}</p>` : html`<ul><li>${'client'}</li><li>${'b'}</li></ul>`}</div>`;
}

export const mismatch = () => html`<app-mismatch></app-mismatch>`;
