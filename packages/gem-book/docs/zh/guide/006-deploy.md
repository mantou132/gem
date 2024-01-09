# 部署

只需要使用 `npx gem-book docs --build` 构建前端资源（`index.html`，`*.js`...），然后为输出目录（默认为 `dist`）提供静态服务即可。

> [!WARNING]
> 由于 `<gem-book>` 使用了 [History API](https://developer.mozilla.org/en-US/docs/Web/API/History)，所以默认不支持 Github Pages

## Netlify

Netlify 中配置构建命令和输出目录，然后在项目根目录中添加 `netlify.toml` 文件配置重定向规则以及缓存规则：

```toml
[[redirects]]
  from = "/*"
  to = "/"
  status = 200
[[headers]]
for = "/*"
  [headers.values]
  Access-Control-Allow-Origin = "*"
  Cache-Control = "public, max-age=31536000, immutable"
```

## Vercel

Vercel 中配置构建命令和输出目录，然后在项目根目录中添加 `vercel.json` 文件配置重定向规则以及缓存规则：

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```
