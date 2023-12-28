# `<dy-link>`

See [`<gem-link>`](https://gemjs.org/zh/api/built-in-element)

## Example

<gbp-example name="dy-active-link" src="https://esm.sh/duoyun-ui/elements/link">

```json
[
  {
    "path": "/test/test",
    "pattern": "/test/*",
    "innerHTML": "这个链接没有匹配当前路由\n<style>dy-active-link:where([data-active],:state(active)){color: red})</style>"
  },
  {
    "path": "/",
    "pattern": "/*",
    "innerHTML": "这个链接匹配当前路由"
  }
]
```

</gbp-example>
