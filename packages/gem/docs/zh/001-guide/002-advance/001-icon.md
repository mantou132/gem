# 使用图标

[SVG Sprite](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) 不能在 [ShadowDOM](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_components/Using_shadow_DOM) 中生效。

## 字体图标

通常我们使用 Class 来映射字符，例如：

```html
<style>
  .fa-house {
    --fa: "\f015";
  }
</style>
<i class="fal fa-house"></i>
```

这需要保证样式在每个 Shadow DOM 中应用才能使用，可以考虑使用连字特性来显示图标，其可访问性也更好：

<gbp-sandpack dependencies="@mantou/gem">

```js index.js
import './icon.js';

@customElement('my-element')
@shadow()
class MyElement extends GemElement {
  @template()
  #content = () => {
    return html`
      <g-icon>chevron_right</g-icon>
      <g-icon>home</g-icon>
      <g-icon>menu</g-icon>
    `;
  };
}
```

```js icon.js
const styles = css`
  & {
    font-size: 24px;
    font-family: 'Material Icons';
  }
`;

@customElement('g-icon')
@adoptedStyle(styles)
@aria({ role: 'img' })
class GIconElement extends GemElement {}
```

```html index.html
<style>
  @font-face {
    font-family: "Material Icons";
    src: url("https://fonts.gstatic.com/s/materialicons/v143/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2") format("woff2");
    font-style: normal;
    font-weight: 400;
    font-display: block;
  }
</style>
<my-element></my-element>
```

</gbp-sandpack>

## SVG 图标

Gem 内置了 `<gem-use>` 元素，可以用来替代 SVG Sprite：

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

### 模块化与按需引入

推荐将图标按模块拆分为独立文件并具名导出 SVG 字符串，再传给 `<gem-use .element=${...}>`，既支持 SSR，也能被构建工具自动 Tree-shaking：

```ts
// icons/editor.ts
import { raw } from '@mantou/gem';

export const menu = raw`
  <svg part="icon" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </svg>
`;
```

如果项目直接维护 `.svg` 文件，可以通过构建工具按原始字符串导入（如 `import menu from './menu.svg?raw'`）；如果使用开源图标库，也可以配合 [unplugin-icons](https://github.com/unplugin/unplugin-icons)（`compiler: 'raw'`）按需引入字符串：

```ts
import IconMenu from '~icons/lucide/menu';

html`<gem-use .element=${IconMenu}></gem-use>`;
```

### 样式定制

- **颜色**：在 SVG 中使用 `fill="currentColor"`（或 `stroke="currentColor"`），即可直接继承外部 CSS 的 `color`。
- **尺寸**：`<gem-use>` 内部默认设置了 `svg { width: 100%; height: 100%; }`，保留 `viewBox` 后直接控制 `<gem-use>` 的 `width` / `height` 即可。
- **局部样式**：`<gem-use>` 使用 Shadow DOM 渲染，需要定制局部颜色或样式时，可为 `<svg>` 或内部 `<path>` 添加 `part` 属性，在外部通过 `::part()` 穿透控制：

```ts
const sort = raw`
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path part="up" d="M8 13v-7.175L5.425 8.4l-1.425-1.4 5-5 5 5-1.425 1.4-2.575-2.575v7.175h-2Z" />
    <path part="down" d="M15 22 10 17l1.425-1.4 2.575 2.575v-7.175h2v7.175l2.575-2.575 1.425 1.4L15 22Z" />
  </svg>
`;
```

```css
gem-use {
  width: 1.5em;
  color: gray;
}
gem-use::part(up) {
  fill: red;
}
```

### 开源图标库

有许多开源图标库可以直接在你的项目中使用：
- [Lucide](https://lucide.dev/)
- [Radix](https://github.com/radix-ui/icons)
- [Feather](https://github.com/feathericons/feather)
- [Fluent](https://github.com/microsoft/fluentui-system-icons)
- [Material](https://material.io/resources/icons)
- [Tabler](http://tablericons.com/)
