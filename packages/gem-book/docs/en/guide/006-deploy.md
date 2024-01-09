# Deploy

Just use `npx gem-book docs --build` to build front-end resources (`index.html`, `*.js`...), and then provide static services for the output directory.

> [!WARNING]
> Because `<gem-book>` uses [History API](https://developer.mozilla.org/en-US/docs/Web/API/History), so Github Pages is not supported by default

## Netlify

Configure the build script and publish directory in Netlify, and then configure the redirection rules in the project `netlify.toml`:

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

Configure the build script and publish directory in Vercel, and then configure the redirection rules in the project `vercel.json`:

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
