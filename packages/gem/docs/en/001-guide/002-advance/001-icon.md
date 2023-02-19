# Use SVG icons

Because Gem uses ShadowDOM to organize elements, it prevents style conflicts and also makes [SVG Sprite](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) invalid. SVG references cannot penetrate ShadowDOM boundaries.

Gem has a built-in element `<gem-use>` to replace SVG Sprite:

<gbp-sandpack>

```js index.js
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

```json package.json hidden
{
  "dependencies": {
    "@mantou/gem": "latest"
  }
}
```

</gbp-sandpack>

_`<gem-use>` since the content is copied for rendering, the update of `<svg>` cannot update the original `<gem-use>` instance_
