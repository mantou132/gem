# `<tap-pat-picker>`

Searchable single-select list page with an alphabetical index, modeled on the Region picker in iOS Settings. Suited to long lists such as countries/regions, cities and languages.

It only emits `change` on selection; going to the next level or closing is up to the caller. Put it in `Sheet.open({ hasStack: true })` for multi-level selection.

## Example

<gbp-example name="tap-pat-picker" src="https://esm.sh/@mantou/tap-ui/patterns/picker">

```json
[
  {
    "style": "width: 100%; height: 400px",
    "searchable": true,
    "indexed": true,
    "value": "Banana",
    "items": [
      { "label": "Apple" },
      { "label": "Banana" },
      { "label": "Cherry" },
      { "label": "Durian" },
      { "label": "Grape" },
      { "label": "Mango" },
      { "label": "Orange" },
      { "label": "Peach" }
    ],
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## Country or region

`getRegionItems` uses `Intl.DisplayNames` to generate names in the current language with flags, searchable by code and English name; in Chinese the items are grouped by pinyin initial.

```ts
import { html } from '@mantou/gem/lib/element';
import { Sheet } from '@mantou/tap-ui/elements/sheet';
import { getCurrentRegion, getRegionItems } from '@mantou/tap-ui/lib/region';

import '@mantou/tap-ui/patterns/picker';

const { sheet } = Sheet.open({
  hasStack: true,
  snap: [0.9],
  body: html`
    <tap-pat-picker
      heading="Country or Region"
      searchable
      indexed
      pinned-heading="Current"
      value=${region}
      .items=${getRegionItems()}
      .pinned=${getRegionItems([getCurrentRegion()])}
      @change=${(evt) => {
        region = evt.detail;
        sheet.close(null);
      }}
    ></tap-pat-picker>
  `,
});
```

## Multi-level

Set `action: true` on items with a next level, and push the next level into the current stack on selection; the data comes from the app.

```ts
import { Stack } from '@mantou/tap-ui/elements/stack';

const page = (parent, back) => html`
  <tap-pat-picker
    heading=${parent}
    ?back=${back}
    .items=${areas[parent].map((label) => ({ label, action: !!areas[label] }))}
    @change=${(evt) => {
      if (areas[evt.detail]) {
        Stack.getClosestStack(evt.target)?.push({ content: page(evt.detail, true) });
      } else {
        sheet.close(null);
      }
    }}
  ></tap-pat-picker>
`;

const { sheet } = Sheet.open({ hasStack: true, snap: [0.9], body: page('China', false) });
```

## API

<gbp-api name="tap-pat-picker" src="/src/patterns/picker.ts"></gbp-api>
