# Deploy

Just use `--build` to build front-end resources (`index.html`, `gem-book.json`...), and then provide static services for the output directory.

> [!WARNING]
> Because `<gem-book>` uses [History API](https://developer.mozilla.org/en-US/docs/Web/API/History), so Github Pages is not supported by default

## Netlify

Configure the build script (`gem-book docs --build`) and publish directory (`docs`) in Netlify, and then configure the redirection rules in the project `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/"
  status = 200
```

## Vercel

Configure the build script (`gem-book docs --build`) and publish directory (`docs`) in Vercel, and then configure the redirection rules in the project `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```
