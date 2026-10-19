import { adoptedStyle, attribute, css, customElement, GemElement, mounted, state } from '@mantou/gem';

import { localImports } from '../lib/imports';

const style = css`
  :scope:not(:state(finished)) {
    display: inline-block;
    width: attr(width px);
    height: attr(height px);
  }
`;

/** 网址模块的依赖从 esm.sh 加载，例如 `canvas-confetti, lodash@4` */
const getImportMap = (dependencies: string) =>
  Object.fromEntries(
    ['@mantou/gem', ...dependencies.split(',')]
      .map((dep) => dep.trim())
      .filter(Boolean)
      .map((dep) => {
        const [name, version = 'latest'] = dep.split(/(.+)@/).filter(Boolean);
        return [name, `https://esm.sh/${name}@${version}`];
      }),
  );

/**
 * 在客户端加载模块，本地文件和网站一起打包，网址的 `.ts` 使用 esm.sh 编译，
 * 加载后在后面插入 `name` 元素
 */
@customElement('gbp-import')
@adoptedStyle(style)
export class GbpImportElement extends GemElement {
  @attribute src: string;
  @attribute name: string;
  @attribute dependencies: string;
  @state finished: boolean;

  @mounted()
  #load = async () => {
    try {
      const load = localImports.get(this.src);
      if (load) {
        await load();
        return;
      }
      if (/\.m?js$/.test(new URL(this.src, location.href).pathname)) {
        await import(/* webpackIgnore: true */ this.src);
        return;
      }
      const res = await fetch(this.src);
      if (!res.ok) throw new Error(res.statusText || 'Not Found');
      const body = JSON.stringify({
        lang: 'ts',
        code: await res.text(),
        target: 'es2022',
        importMap: { imports: getImportMap(this.dependencies) },
      });
      const { code } = await (await fetch('https://esm.sh/transform', { method: 'POST', body })).json();
      const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      await import(/* webpackIgnore: true */ url);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      this.finished = true;
      if (this.name) this.after(document.createElement(this.name));
    }
  };
}
