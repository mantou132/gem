# `<dy-coach-mark>`

## Example

先定义 `Tours`:

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

在合适的位置添加 `<dy-coach-mark>`，并添加 `index` 属性，它将从 `Tours` 中匹配索引，在元素显示的同时显示 `Tour`：

```ts
html`<div class="container"><dy-coach-mark index="0"></dy-coach-mark></div>`;
```

## API

<gbp-api src="/src/elements/coach-mark.ts"></gbp-api>
