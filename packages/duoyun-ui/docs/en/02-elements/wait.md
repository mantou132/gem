# `<dy-wait>`

## Example

<gbp-example name="dy-button" src="https://esm.sh/duoyun-ui/elements/wait,https://esm.sh/duoyun-ui/elements/button">

```json
{
  "@click": "()=>customElements.get('dy-wait').wait(new Promise(res => setTimeout(res, 1500)))",
  "innerHTML": "Click"
}
```

</gbp-example>

```ts
import { waitLoading } from '@duoyun-fe/duoyun-ui/elements/wait';

function onClick() {
  waitLoading(new Promise((res) => setTimeout(res, 1500)));
}
```

## API

<gbp-api src="/src/elements/wait.ts"></gbp-api>
