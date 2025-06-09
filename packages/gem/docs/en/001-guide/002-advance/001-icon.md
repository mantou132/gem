# Use Icon

[SVG Sprite](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) cannot be at [ShadowDOM](https://developer.mozilla.org/en-s/docs/web_components/usion_shadow_dom) takes effect.

## Font icons

Usually we use class name to map characters, for example:

```html
<style>
  .fa-house {
    --fa: "\f015";
  }
</style>
<i class="fal fa-house"></i>
```

This requires ensuring that the style is applied in each Shadow DOM to be used. Consider using the ligature feature to display the icon, which is also more accessible:

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

## SVG icons

Gem has a built-in element `<gem-user>` to replace SVG Sprite:

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

> [!NOTE] `<gem-use>` since the content is copied for rendering, the update of `<svg>` cannot update the original `<gem-use>` instance

There are many open source icon libraries that can be used directly in your projects:

- [Lucide](https://lucide.dev/)
- [Radix](https://github.com/radix-ui/icons)
- [Feather](https://github.com/feathericons/feather)
- [Fluent](https://github.com/microsoft/fluentui-system-icons)
- [Material](https://material.io/resources/icons)
- [Tabler](http://tablericons.com/)
