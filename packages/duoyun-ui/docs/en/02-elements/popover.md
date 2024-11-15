# `<dy-popover>`

## Example

<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render } from '@mantou/gem';

render(
  html`
    <dy-popover
      trigger="click"
      .content=${html`
        <div
          style="width: 200px; height: 100px; display: flex; place-items: center; place-content: center;"
        >
          ${new Date().toLocaleString()}
        </div>
      `}
    >
      <dy-button>Current Time</dy-button>
    </dy-popover>
  `,
  document.getElementById('root'),
);
```

</gbp-sandpack>

## API

<gbp-api name="dy-popover" src="/src/elements/popover.ts"></gbp-api>
