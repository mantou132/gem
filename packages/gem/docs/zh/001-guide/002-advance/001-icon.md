# 使用 SVG 图标

[SVG Sprite](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) 不能在 [ShadowDOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM) 中生效，因此，Gem 有一个内置元素 `<gem-use>`，来用替代 SVG Sprite：

<gbp-sandpack dependencies="@mantou/gem">

```js index.js
import { render } from '@mantou/gem';

const icon = `
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path d="M0 0h24v24H0z" fill="none" />
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </svg>
`;

render(
  html`
    <template id="icon">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none" />
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
      </svg>
    </template>
    <gem-use selector="#icon"></gem-use>
    <gem-use .root=${document.body} selector="#icon"></gem-use>
    <gem-use .element=${icon}></gem-use>
  `,
  document.getElementById('root'),
);
```

</gbp-sandpack>

> [!NOTE] `<gem-use>` 由于是复制内容进行渲染，所以 `<svg>` 更新不能同步更新原先的 `<gem-use>` 实例

有许多开源图标库可以直接在你的项目中使用：

- [Lucide](https://lucide.dev/)
- [Radix](https://github.com/radix-ui/icons)
- [Feather](https://github.com/feathericons/feather)
- [Fluent](https://github.com/microsoft/fluentui-system-icons)
- [Material](https://material.io/resources/icons)
- [Tabler](http://tablericons.com/)
