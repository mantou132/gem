# `<tap-link>`

用于创建支持激活状态的导航链接，在 `<gem-link>` 的基础上增加了路径模式匹配和激活状态样式。

参考 [`<gem-link>`](https://gemjs.org/zh/api/built-in-element)

## Example

<gbp-example name="tap-active-link" src="https://esm.sh/@mantou/tap-ui/elements/link">

```json
[
  {
    "tagName": "style",
    "innerHTML": "tap-active-link:state(active){color: red})"
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
