# Use Icon

[SVG Sprite](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) does not work inside [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM).

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

## SVG icons

Gem has a built-in element `<gem-use>` to replace SVG Sprite:

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

### Modularization and on-demand import

Split icons into separate modules with named SVG string exports and pass them to `<gem-use .element=${...}>`. This works with SSR and enables tree-shaking out of the box:

```ts
// icons/editor.ts
import { raw } from '@mantou/gem';

export const menu = raw`
  <svg part="icon" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </svg>
`;
```

If you maintain `.svg` files directly, import them as raw strings via your bundler (e.g. `import menu from './menu.svg?raw'`). For open source icon sets, you can also use [unplugin-icons](https://github.com/unplugin/unplugin-icons) with `compiler: 'raw'` to import SVG strings on demand:

```ts
import IconMenu from '~icons/lucide/menu';

html`<gem-use .element=${IconMenu}></gem-use>`;
```

### Styling

- **Color**: Use `fill="currentColor"` (or `stroke="currentColor"`) in the SVG so it inherits the external CSS `color`.
- **Size**: `<gem-use>` applies `svg { width: 100%; height: 100%; }` internally; keep `viewBox` on the SVG and control size with `width` / `height` on `<gem-use>`.
- **Partial styling**: `<gem-use>` renders in Shadow DOM. Add `part` attributes to `<svg>` or inner `<path>` elements and target them from outside with `::part()`:

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

### Open source icon libraries

There are many open source icon libraries that can be used directly in your projects:
- [Lucide](https://lucide.dev/)
- [Radix](https://github.com/radix-ui/icons)
- [Feather](https://github.com/feathericons/feather)
- [Fluent](https://github.com/microsoft/fluentui-system-icons)
- [Material](https://material.io/resources/icons)
- [Tabler](http://tablericons.com/)
