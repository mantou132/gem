# Deploy

Use `npx gem-book build docs` to build the website into `dist/web`, then provide static services for this directory, no rewrite rules are needed:

- Every page is prerendered into its own `index.html`, e.g. `dist/web/guide/index.html`
- `404.html` is the page of paths not found, it is used by GitHub Pages, Netlify, Vercel etc. automatically
- [Redirects](./004-metadata.md) are pages that redirect with `<meta http-equiv="refresh">`
- The scripts and styles in `dist/web/static` have hashes in file names, they can be cached for a long time
- [`llms.txt`](https://llmstxt.org/) lists all pages for LLMs, `llms-full.txt` contains the content of all pages, every page also has a Markdown version with plugins expanded, e.g. `dist/web/guide.md`, with multiple languages they are in the language directories, the ones in the root directory are of the default language; only the latest version is included
- `sitemap.xml` is generated when [`site`](../002-cli.md#site) is configured
- Pages have `<link rel="canonical">`, and `<link rel="alternate" hreflang>` of other languages, the description comes from [`description`](./004-metadata.md)
- Use `npx gem-book serve docs` to preview the built website locally

## GitHub Pages

Upload `dist/web` with [GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), for example:

```yaml
- run: npx gem-book build docs
- uses: actions/upload-pages-artifact@v3
  with:
    path: dist/web
- uses: actions/deploy-pages@v4
```

## Netlify / Vercel

Set the build command to `npx gem-book build docs`, the publish (output) directory to `dist/web`, optionally cache the static resources for a long time, for example `vercel.json`:

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
