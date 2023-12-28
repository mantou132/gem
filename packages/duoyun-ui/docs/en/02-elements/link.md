# `<dy-link>`

See [`<gem-link>`](https://gemjs.org/zh/api/built-in-element)

## Example

<gbp-example name="dy-active-link" src="https://esm.sh/duoyun-ui/elements/link">

```json
[
  {
    "path": "/test/test",
    "pattern": "/test/*",
    "innerHTML": "This link not match current route\n<style>dy-active-link:where([data-active],:state(active)){color: red})</style>"
  },
  {
    "path": "/",
    "pattern": "/*",
    "innerHTML": "This link match current route"
  }
]
```

</gbp-example>
