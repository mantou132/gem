# `<dy-toast>`

## Example

<gbp-example name="dy-toast" src="https://jspm.dev/duoyun-ui/elements/toast">

```json
{
  "style": "width: 100%; position: relative; top: 0; z-index: auto;",
  "items": [
    {
      "type": "success",
      "content": "This is success"
    },
    {
      "type": "warning",
      "content": "This is warning"
    },
    {
      "type": "error",
      "content": "This is error"
    }
  ]
}
```

</gbp-example>

<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render, html } from '@mantou/gem';
import { Toast } from 'duoyun-ui/elements/toast';

const success = () => Toast.open('success', new Date().toLocaleString());

render(html`<button @click=${success}>打开吐司</button>`, document.getElementById('root'));
```

</gbp-sandpack>

## API

<gbp-api src="/src/elements/toast.ts"></gbp-api>
