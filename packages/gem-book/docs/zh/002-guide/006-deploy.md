# 部署

只需要使用 `--build` 构建前端资源（`index.html`，`*.js`...），然后为输出目录（默认为 `dist`）提供静态服务即可。

> [!WARNING]
> 由于 `<gem-book>` 使用了 [History API](https://developer.mozilla.org/en-US/docs/Web/API/History)，所以默认不支持 Github Pages

## Netlify

Netlify 中配置构建脚本（`gem-book docs --build`）和输出目录，然后在项目中 `netlify.toml` 配置重定向规则：

```toml
[[redirects]]
  from = "/*"
  to = "/"
  status = 200
```

## Vercel

Vercel 中配置构建脚本（`gem-book docs --build`）和输出目录，然后在项目中 `vercel.json` 配置重定向规则：

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```
