# `<dy-coach-mark>`

## Example

先定义 `Tours`, `<dy-coach-mark>` 将根据 `index` 显示内容:

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

在合适的位置添加 `<dy-coach-mark>`

```ts
html`<div class="container"><dy-coach-mark index="0"></dy-coach-mark></div>`;
```

## API

<gbp-api src="/src/elements/coach-mark.ts"></gbp-api>
