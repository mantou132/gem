# `<dy-toast>`

## Example

<gbp-example name="dy-button" src="https://esm.sh/duoyun-ui/elements/toast,https://esm.sh/duoyun-ui/elements/button">

```json
[
  {
    "innerHTML": "Success",
    "color": "positive",
    "@click": "()=>customElements.get('dy-toast').open('success', '这是一条消息')"
  },
  {
    "innerHTML": "Warning",
    "color": "notice",
    "@click": "()=>customElements.get('dy-toast').open('warning', '这是一条消息')"
  },
  {
    "innerHTML": "Error",
    "color": "negative",
    "@click": "()=>customElements.get('dy-toast').open('error', '这是一条消息')"
  }
]
```

</gbp-example>

```ts
import { Toast } from 'duoyun-ui/elements/toast';

function onClick() {
  Toast.open('success', '这是一条消息');
}
```

## API

<gbp-api src="/src/elements/toast.ts"></gbp-api>
