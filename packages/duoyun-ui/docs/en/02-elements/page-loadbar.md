# `<dy-page-loadbar>`

## Example

<gbp-example name="dy-button" src="https://esm.sh/duoyun-ui/elements/page-loadbar,https://esm.sh/duoyun-ui/elements/button">

```json
{
  "@click": "()=>{const Loadbar=customElements.get('dy-page-loadbar');Loadbar.start();setTimeout(()=>Loadbar.end(),3000);}",
  "innerHTML": "Show page loader"
}
```

</gbp-example>

```ts
import { Loadbar } from '@duoyun-fe/duoyun-ui/elements/page-loadbar';

function onClick() {
  Loadbar.start();
  setTimeout(() => Loadbar.end(), 3000);
}
```

## API

<gbp-api src="/src/elements/page-loadbar.ts"></gbp-api>
