# `<dy-coach-mark>`

## Example

First define `Tours`:

```ts
import { setTours } from '@duoyun-fe/duoyun-ui/elements/coach-mark';

setTours([
  {
    title: 'starterTitle',
    description: 'starterDesc',
  },
  {
    preview: 'https://image.cloudfine.com/img/202201061900942.png',
    title: 'starterAnalyticsTitle',
    description: 'starterAnalyticsDesc',
  },
  {
    title: 'starterMenuTitle',
    description: 'starterMenuDesc',
  },
]);
```

Add `<dy-coach-mark>` in a DOM tree, add the `index` attribute, it will match the composite from the `Tours`, Tour while displaying the elements:

```ts
html`<div class="container"><dy-coach-mark index="0"></dy-coach-mark></div>`;
```

## API

<gbp-api src="/src/elements/coach-mark.ts"></gbp-api>
