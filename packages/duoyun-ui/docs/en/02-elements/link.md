# `<dy-link>`

See [`<gem-link>`](https://gemjs.org/zh/api/built-in-element)

## Example

<gbp-example name="dy-active-link" src="https://esm.sh/duoyun-ui/elements/link">

```json
[
  {
    "tagName": "style",
    "innerHTML": "dy-active-link:state(active){color: red})"
  },
  {
    "path": "/test/test",
    "pattern": "/test/*",
    "innerHTML": "This link not match current route"
  },
  {
    "path": "/",
    "pattern": "/*",
    "innerHTML": "This link match current route"
  }
]
```

</gbp-example>
