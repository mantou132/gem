# `<dy-menu>`

## Example

<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render, html } from '@mantou/gem';
import { ContextMenu } from 'duoyun-ui/elements/menu';

import 'duoyun-ui/elements/button';

const onClick = (e: MouseEvent) => {
  ContextMenu.open(
    [
      {
        text: 'Add',
      },
      {
        text: 'Edit',
      },
      {
        text: '---',
      },
      {
        text: 'Delete',
        danger: true,
      },
    ],
    { activeElement: e.target },
  );
};

render(html`<dy-button @click=${onClick}>Open Menu</dy-button>`, document.getElementById('root'));
```

</gbp-sandpack>

## API

<gbp-api src="/src/elements/menu.ts"></gbp-api>
