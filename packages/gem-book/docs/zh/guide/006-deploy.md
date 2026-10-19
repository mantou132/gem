# 部署

使用 `npx gem-book build docs` 将网站构建到 `dist/web`，然后为该目录提供静态服务即可，不需要配置重写规则：

- 每个页面都预渲染成自己的 `index.html`，例如 `dist/web/guide/index.html`
- `404.html` 是找不到路径时的页面，GitHub Pages、Netlify、Vercel 等会自动使用
- [重定向](./004-metadata.md)是使用 `<meta http-equiv="refresh">` 跳转的页面
- `dist/web/static` 中的脚本和样式文件名中有哈希，可以长时间缓存
- [`llms.txt`](https://llmstxt.org/) 给 LLM 列出所有页面，`llms-full.txt` 包含所有页面的内容，每个页面也有展开了插件的 Markdown 版本，例如 `dist/web/guide.md`，多语言时它们在语言目录中，根目录中的是默认语言的；只包括最新版本
- 配置了 [`site`](../002-cli.md#site) 时会生成 `sitemap.xml`
- 页面有 `<link rel="canonical">` 和其他语言的 `<link rel="alternate" hreflang>`，描述来自 [`description`](./004-metadata.md)
- 使用 `npx gem-book serve docs` 在本地预览构建的网站

## GitHub Pages

使用 [GitHub Actions](https://docs.github.com/zh/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) 上传 `dist/web`，例如：

```yaml
- run: npx gem-book build docs
- uses: actions/upload-pages-artifact@v3
  with:
    path: dist/web
- uses: actions/deploy-pages@v4
```

## Netlify / Vercel

构建命令设置为 `npx gem-book build docs`，发布（输出）目录设置为 `dist/web`，可以让静态资源长时间缓存，例如 `vercel.json`：

```json
{
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```
