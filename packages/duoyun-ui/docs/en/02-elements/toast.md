# `<dy-toast>`

## Example

<gbp-example name="dy-button" src="https://esm.sh/duoyun-ui/elements/toast,https://esm.sh/duoyun-ui/elements/button">

```json
[
  {
    "innerHTML": "Success",
    "color": "positive",
    "@click": "()=>customElements.get('dy-toast').open('success', 'This is success')"
  },
  {
    "innerHTML": "Warning",
    "color": "notice",
    "@click": "()=>customElements.get('dy-toast').open('warning', 'This is warning')"
  },
  {
    "innerHTML": "Error",
    "color": "negative",
    "@click": "()=>customElements.get('dy-toast').open('error', 'This is error')"
  }
]
```

</gbp-example>

```ts
import { Toast } from 'duoyun-ui/elements/toast';

function onClick() {
  Toast.open('success', 'This is success');
}
```

## API

<gbp-api src="/src/elements/toast.ts"></gbp-api>
