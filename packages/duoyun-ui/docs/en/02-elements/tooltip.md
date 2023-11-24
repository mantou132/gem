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
      <dy-button>Current Time</dy-button>
    </dy-tooltip>
  `,
  document.getElementById('root'),
);
```

</gbp-sandpack>

## API

<gbp-api src="/src/elements/tooltip.ts"></gbp-api>
