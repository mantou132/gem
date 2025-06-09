# 使用图标

[SVG Sprite](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) 不能在 [ShadowDOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM) 中生效。

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
  render = () => {
    return html`
      <g-icon>chevron_right</g-icon>
      <g-icon>home</g-icon>
      <g-icon>menu</g-icon>
    `;
  }
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

Gem 有一个内置元素 `<gem-use>`，来用替代 SVG Sprite：

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
