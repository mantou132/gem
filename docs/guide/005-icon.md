# ICON

由于 gem 使用 ShadowDOM 来组织元素，提供 css 隔离，同时也使得 [svg sprite](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) 失效，svg 引用不同穿透 ShadowDOM 边界。

gem 有一个内置元素 `<gem-use>`，来用替代 svg sprite：

```js
import { html, render } from '@mantou/gem';

import '@mantou/gem/elements/use';

render(
  html`
    <template id="icon">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none" />
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
      </svg>
    </template>
    <gem-use .root=${document.body} selector="#icon"></gem-use>
    <gem-use selector="#icon"></gem-use>
  `,
  document.body,
);
```

[![Edit svg-icon](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/gem-route-tb4v6?fontsize=14&hidenavigation=1&theme=dark)

_注：`<gem-use>` 由于是复制内容进行渲染，所以 svg 更新 `<gem-use>` 不能同步更新_
