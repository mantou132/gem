# `<dy-map>`

## Example

<gbp-sandpack dependencies="@mantou/gem, duoyun-ui, geo-albers-usa-territories">

```ts
import { render, html } from '@mantou/gem';
import { geoAlbersUsaTerritories } from 'geo-albers-usa-territories';

import 'duoyun-ui/elements/map';

const getProjection = (geoCommonProjection: GeoCommonProjection) => {
  return geoAlbersUsaTerritories().scale(400).translate([0, 0]);
};

fetch(
  'https://raw.githubusercontent.com/mantou132/javascript-learn/master/geo/us.json',
)
  .then((res) => res.json())
  .then((geo) => {
    render(
      html`
        <dy-map
          .geo=${geo}
          .getProjection=${getProjection}
          .getAreaName=${(name) => name}
          .getAreaColor=${(name) => (name === 'Kansas' ? 'green' : undefined)}
          .nodes=${[{ id: 'Topeka', position: [95.6752, 39.0473] }]}
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
