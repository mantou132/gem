# 使用 SVG 图标

由于 Gem 使用 ShadowDOM 来组织元素，防止了样式冲突的同时也使得 [SVG Sprite](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) 失效，SVG 引用不能穿透 ShadowDOM 边界。

Gem 有一个内置元素 `<gem-use>`，来用替代 SVG Sprite：

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

_`<gem-use>` 由于是复制内容进行渲染，所以 `<svg>` 更新不能同步更新 `<gem-use>`_
