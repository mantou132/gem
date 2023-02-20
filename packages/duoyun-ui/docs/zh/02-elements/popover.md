# `<dy-popover>`

## Example

<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render, html } from '@mantou/gem';

import 'duoyun-ui/elements/popover';
import 'duoyun-ui/elements/button';

render(
  html`
    <dy-popover
      trigger="click"
      .content=${html`
        <div style="width: 200px; height: 100px; display: flex; place-items: center; place-content: center;">
          ${new Date().toLocaleString()}
        </div>
      `}
    >
      <dy-button>当前时间</dy-button>
    </dy-popover>
  `,
  document.body,
);
```

</gbp-sandpack>

## API

<gbp-api name="dy-popover" src="/src/elements/popover.ts"></gbp-api>
