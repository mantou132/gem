/**
 * 本地文件的 `<gbp-import>` 模块，和网站一起打包，使用网站的 Gem 和项目安装的依赖，
 * key 是相对于项目目录的路径，由 CLI 生成的 `app.ts` 注册
 */
export const localImports = new Map<string, () => Promise<unknown>>();
