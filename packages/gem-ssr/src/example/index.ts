import '../lib/shim';

import { serve } from '@hono/node-server';
import { html, type TemplateResult } from '@mantou/gem/lib/lit-html';
import { build } from 'esbuild';
import { type Context, Hono } from 'hono';
import { stream } from 'hono/streaming';

import { render } from '..';

import './elements/app';
import './elements/card';

const app = new Hono();

async function* renderPage(ctx: Context, template: TemplateResult, scripts: string[]) {
  yield `<!doctype html><html><body>`;
  yield* render(template, { url: ctx.req.url });
  for (const script of scripts) {
    yield script.startsWith('<script') ? script : `<script src="${script}"></script>`;
  }
  yield `</body></html>`;
}

async function buildJS(ctx: Context, elementPath: string) {
  await new Promise((res) => setTimeout(res, 1000));
  const result = await build({
    stdin: {
      contents: `
          ${ctx.req.header('Referer')?.includes('spa') ? '//' : ''} import './src/client/index.ts';
          import '${elementPath}';
        `,
      resolveDir: process.cwd(),
      sourcefile: 'virtual.ts',
    },
    bundle: true,
    write: false,
    target: 'es2022',
  });
  return ctx.text(result.outputFiles[0].text);
}

app.get('/simple', (ctx) => {
  ctx.header('Content-Type', 'text/html');
  return stream(ctx, async (resStream) => {
    const template = html`
      <gem-ssr-card header=${'Card 1'}>
        Nulla deserunt labore amet occaecat ad officia. Proident mollit elit nostrud nostrud nulla pariatur mollit
        cillum pariatur commodo sunt enim. Dolor exercitation duis magna nisi excepteur proident exercitation mollit.
        Amet cillum excepteur nulla ipsum incididunt.
      </gem-ssr-card>
    `;
    const scripts = [
      `<script>console.log('Hydration before:', document.querySelector('gem-ssr-card').shadowRoot.querySelector('.header'))</script>`,
      '/card.js',
    ];
    await resStream.pipe((ReadableStream as any).from(renderPage(ctx, template, scripts)));
  });
});

app.get('/card.js', (ctx) => buildJS(ctx, './src/example/elements/card.ts'));
app.get('/dist.js', (ctx) => buildJS(ctx, './src/example/elements/app.ts'));

app.get('*', (ctx) => {
  ctx.header('Content-Type', 'text/html');
  return stream(ctx, async (resStream) => {
    await resStream.pipe(
      (ReadableStream as any).from(
        renderPage(ctx, html`<gem-ssr-app></gem-ssr-app>`, [
          `<script>console.log('Hydration before:', document.querySelector('gem-ssr-card').shadowRoot.querySelector('.header'))</script>`,
          '/dist.js',
        ]),
      ),
    );
  });
});

serve({ fetch: app.fetch, port: 3000 }).on('listening', () => {
  console.log('listening http://localhost:3000/');
});
