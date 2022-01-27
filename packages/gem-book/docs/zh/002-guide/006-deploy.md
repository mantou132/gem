# 部署

只需要使用 `--build` 构建前端资源（`index.html`，`gem-book.json`...），然后为输出目录提供静态服务即可。

_由于 `<gem-book>` 使用了 [History API](https://developer.mozilla.org/en-US/docs/Web/API/History)，所以默认不支持 Github Pages。_

### Netlify

Netlify 中配置构建脚本（`gem-book docs --build`）和发布目录（`docs`），然后在项目中 `netlify.toml` 配置重定向规则：

```toml
[[redirects]]
  from = "/*"
  to = "/"
  status = 200
```

### Vercel

Vercel 中配置构建脚本（`gem-book docs --build`）和发布目录（`docs`），然后在项目中 `vercel.json` 配置重定向规则：

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```
