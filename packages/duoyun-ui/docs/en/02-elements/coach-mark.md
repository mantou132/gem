# `<dy-coach-mark>`

## Example

<gbp-sandpack dependencies="@mantou/gem,duoyun-ui">

```ts
import { render, html } from '@mantou/gem';
import { setTours } from 'duoyun-ui/elements/coach-mark';

import 'duoyun-ui/elements/side-navigation';

setTours(
  [
    {
      preview: 'https://picsum.photos/400/300',
      title: 'starterAnalyticsTitle',
      description: 'starterAnalyticsDesc',
      maskClosable: false,
    },
    {
      title: 'starterMenuTitle',
      description: 'starterMenuDesc',
    },
  ],
  {
    currentIndex: 0,
  },
);

const items = [
  {
    pattern: '/',
    title: 'Nav 1',
    slot: html`<dy-coach-mark index="0"></dy-coach-mark>`,
  },
  {
    pattern: '/test',
    title: 'Nav 2',
    slot: html`<dy-coach-mark index="1"></dy-coach-mark>`,
  },
  {
    title: 'Nav 3',
  },
];

render(
  html`<dy-side-navigation style="width: 50%" .items=${items}></dy-side-navigation>`,
  document.getElementById('root'),
);
```

</gbp-sandpack>

## API

<gbp-api src="/src/elements/coach-mark.ts"></gbp-api>
