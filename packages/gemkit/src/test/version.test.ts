// 必须在 Gem 之前执行，用来模拟 DOM 环境
import '@mantou/gem-ssr';

import test from 'node:test';

import { customElement, GemElement, html, template } from '@mantou/gem';
import { server } from '@mantou/gem-ssr/decorators';

import { ELEMENT_PATH } from '../constants';
import { fetchData, isOutdated, type ServerModule } from '../data';
import { prerenderPage } from '../handler';
import { pageRoute, setOutlets } from '../outlet';
import { page } from '../page';
import { createRenderer } from '../server';

@customElement('app-server-version')
@server()
class ServerVersionElement extends GemElement {
  @template()
  #content = () => html`server`;
}

@page('Home')
class HomePage extends GemElement {
  @template()
  #content = () => html`<app-server-version></app-server-version>`;
}

const home = { tag: 'gemkit-page-index', load: async () => ({ default: HomePage }), server: true };

const serverModules: Record<string, () => Promise<ServerModule>> = {
  [home.tag]: async () => ({ load: () => 'home' }),
};

setOutlets({ '': [pageRoute('/', home, () => html`<gemkit-page-index></gemkit-page-index>`)] });

const renderer = createRenderer({ app: html`<gemkit-outlet></gemkit-outlet>`, serverModules, version: 'v1' });

const documentTemplate = '<!doctype html><html><head><title></title></head><body><!--gemkit-body--></body></html>';

test('version: 数据文件和服务端元素的响应中包含客户端构建的版本', async ({ assert }) => {
  const data = await renderer.loadData(new Request('http://localhost/__data.json'));
  assert.deepEqual(await data.json(), { data: { [home.tag]: 'home' }, version: 'v1' });
  const body = JSON.stringify({ url: '/', elements: [{ tag: 'app-server-version', attrs: {}, props: {} }] });
  const elements = await renderer.renderElements(
    new Request(`http://localhost${ELEMENT_PATH}`, { method: 'POST', body }),
  );
  assert.equal((await elements.json()).version, 'v1');
  const { files } = (await prerenderPage(renderer, documentTemplate, '/'))!;
  assert.equal(JSON.parse(files.get('/__data.json')!).version, 'v1');
  assert.equal(JSON.parse(files.get('/__elements.json')!).version, 'v1');
});

test('version: 数据文件来自另一个版本时客户端的代码已经过时', async ({ assert, mock }) => {
  const respond = (file: object) => mock.method(globalThis, 'fetch', async () => Response.json(file));
  // 开发时没有版本
  respond({ data: { a: 1 } });
  assert.deepEqual(await fetchData('/__data.json', '/'), { data: { a: 1 } });
  respond({ data: { a: 1 }, version: 'v2' });
  await assert.rejects(fetchData('/__data.json', '/'), isOutdated);
  // 跳转地址也属于新的版本
  respond({ redirect: '/a', version: 'v2' });
  await assert.rejects(fetchData('/__data.json', '/'), isOutdated);
});

test('isOutdated: 重新部署后 chunk 加载失败', ({ assert }) => {
  const chunkError = new Error('Loading chunk 1 failed.');
  chunkError.name = 'ChunkLoadError';
  assert.equal(isOutdated(chunkError), true);
  const cssError = new Error('Loading CSS chunk 1 failed.') as Error & { code?: string };
  cssError.code = 'CSS_CHUNK_LOAD_FAILED';
  assert.equal(isOutdated(cssError), true);
  assert.equal(isOutdated(new TypeError('x is undefined')), false, '模块中的错误');
});
