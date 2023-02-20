# `<dy-tooltip>`

## Example

<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render, html } from '@mantou/gem';

import 'duoyun-ui/elements/tooltip';
import 'duoyun-ui/elements/button';

render(
  html`
    <dy-tooltip .content=${new Date().toLocaleString()}>
      <dy-button>当前时间</dy-button>
    </dy-tooltip>
  `,
  document.body,
);
```

</gbp-sandpack>

## API

<gbp-api src="/src/elements/tooltip.ts"></gbp-api>
