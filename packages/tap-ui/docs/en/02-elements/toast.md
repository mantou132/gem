# `<tap-toast>`

Lightweight toast notification component. Provides different semantic types (info, success, warning, error, loading), custom action button, and imperative static method calls.

## Example

<gbp-example name="tap-button" src="https://esm.sh/@mantou/tap-ui/elements/toast, https://esm.sh/@mantou/tap-ui/elements/button">

```json
[
  {
    "innerHTML": "Success",
    "color": "positive",
    "@click": "()=>customElements.get('tap-toast').open('success', 'This is a message')"
  },
  {
    "innerHTML": "Warning",
    "color": "notice",
    "@click": "()=>customElements.get('tap-toast').open('warning', 'This is a message')"
  },
  {
    "innerHTML": "Error",
    "color": "negative",
    "@click": "()=>customElements.get('tap-toast').open('error', 'This is a message')"
  }
]
```

</gbp-example>

### Imperative Calling

```ts
import { Toast } from '@mantou/tap-ui/elements/toast';

Toast.open('success', 'This is a message');

Toast.open({
  type: 'info',
  content: 'Action supported',
  action: {
    text: 'Undo',
    handle: () => console.log('undo'),
  },
});
```

## API

<gbp-api name="tap-toast" src="/src/elements/toast.ts"></gbp-api>
