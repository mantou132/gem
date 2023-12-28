# `<dy-chart-tooltip>`

## Example

See [`<dy-area-chart>`](./area-chart.md)

```ts
import { ChartTooltip } from '@duoyun-fe/duoyun-ui/elements/chart-tooltip';

function onPointerMove({ x, y }) {
  ChartTooltip.open(x, y, {
    values: [
      {
        label: 'label',
        value: '123',
      },
    ],
  });
}

function onPointerOut() {
  ChartTooltip.close();
}
```

## API

<gbp-api src="/src/elements/chart-tooltip.ts"></gbp-api>
