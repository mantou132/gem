# Use SVG icons

[SVG Sprite](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) cannot be at [ShadowDOM](https://developer.mozilla.org/en-s/docs/web_components/usion_shadow_dom) takes effect. Therefore, Gem has a built-in element `<gem-user>` to replace SVG Sprite:

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
