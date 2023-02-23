# `<dy-coach-mark>`

## Example

<gbp-sandpack dependencies="@mantou/gem,duoyun-ui">

```ts
import { render, html } from '@mantou/gem';
import { setTours } from 'duoyun-ui/elements/coach-mark';

setTours(
  [
    {
      title: 'starterTitle',
      description: 'starterDesc',
    },
    {
      preview: 'https://picsum.photos/400/300',
      title: 'starterAnalyticsTitle',
      description: 'starterAnalyticsDesc',
      maskCloseable: false,
    },
    {
      title: 'starterMenuTitle',
      description: 'starterMenuDesc',
    },
  ],
  {
    currentIndex: 1,
  },
);

render(
  html`
    <style>
      .container {
        position: relative;
        width: 100px;
        line-height: 2;
        margin: 1em;
        background: #eee;
      }
    </style>
    <div class="container">
      <dy-coach-mark index="0"></dy-coach-mark>
      Tour1
    </div>
    <div class="container">
      <dy-coach-mark index="1"></dy-coach-mark>
      Tour2
    </div>
    <div class="container">
      <dy-coach-mark index="2"></dy-coach-mark>
      Tour3
    </div>
  `,
  document.body,
);
```

</gbp-sandpack>

## API

<gbp-api src="/src/elements/coach-mark.ts"></gbp-api>
