# `<dy-map>`

## Example

<gbp-sandpack dependencies="@mantou/gem, duoyun-ui">

```ts
import { render, html } from '@mantou/gem';

import 'duoyun-ui/elements/map';

const getProjection = (geoCommonProjection: GeoCommonProjection) => {
  return geoCommonProjection()
    .translate([10, 10])
    .center([107, 35])
    .scale((360 / 2.5 / Math.PI) * 5.4);
};

fetch(
  'https://raw.githubusercontent.com/mantou132/javascript-learn/master/geo/china.json',
)
  .then((res) => res.json())
  .then((geo) => {
    render(
      html`
        <dy-map
          .geo=${geo}
          .getProjection=${getProjection}
          .getAreaName=${(name) => name}
          .getAreaColor=${(name) => (name === '湖南省' ? 'green' : undefined)}
          .nodes=${[{ id: '长沙市', position: [112.9389, 28.2278] }]}
          @nodehover=${console.log}
          @areahover=${console.log}
          @pan=${({ target, detail: { x, y } }) => {
            const arr = [x, y];
            target.translate2D = [
              target.translate2D[0] + x,
              target.translate2D[1] + y,
            ];
          }}
        ></dy-map>
      `,
      document.getElementById('root'),
    );
  });
```

</gbp-sandpack>

## API

<gbp-api src="/src/elements/map.ts"></gbp-api>
