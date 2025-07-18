import '../lib/shim';

import { serve } from '@hono/node-server';
import { html } from '@mantou/gem/lib/lit-html';
import { build } from 'esbuild';
import { type Context, Hono } from 'hono';
import { stream } from 'hono/streaming';

import { render } from '..';

import './elements/app';

const app = new Hono();

async function* renderApp(ctx: Context) {
  yield `<!doctype html><html><body>`;
  yield* render(html`<gem-ssr-app></gem-ssr-app>`, { url: ctx.req.url });
  yield `<script src="/dist.js"></script>`;
  yield `</body></html>`;
}

app.get('/', (ctx) => {
  ctx.header('Content-Type', 'text/html');
  return stream(ctx, async (resStream) => {
    await resStream.pipe((ReadableStream as any).from(renderApp(ctx)));
  });
});

app.get('/dist.js', async (ctx) => {
  await new Promise((res) => setTimeout(res, 1000));
  const result = await build({
    entryPoints: ['./src/example/elements/app.ts'],
    bundle: true,
    write: false,
    target: 'es2022',
  });
  return ctx.text(result.outputFiles[0].text);
});

serve({ fetch: app.fetch, port: 3000 }).on('listening', () => {
  console.log('listening http://localhost:3000/');
});
