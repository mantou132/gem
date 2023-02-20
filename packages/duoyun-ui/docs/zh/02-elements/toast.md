# `<dy-toast>`

## Example

<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render, html } from '@mantou/gem';
import { Toast } from 'duoyun-ui/elements/toast';

const success = () => Toast.open('success', new Date().toLocaleString());

render(html`<button @click=${success}>打开吐司</button>`, document.body);
```

</gbp-sandpack>

## API

<gbp-api src="/src/elements/toast.ts"></gbp-api>
