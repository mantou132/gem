# `<dy-tabs>`

A tabs component that organizes content into multiple sections, allowing users to switch between different views. It supports centered alignment and provides event handling for tab changes.

## Example

<gbp-example name="dy-tabs" src="https://esm.sh/duoyun-ui/elements/tabs">

```json
{
  "style": "width: 240px",
  "center": true,
  "value": 0,
  "items": [{ "label": "Tab 1" }, { "label": "Tab 2" }, { "label": "Tab 3" }],
  "@change": "(evt) => evt.target.value = evt.detail"
}
```

</gbp-example>

## API

<gbp-api name="dy-tabs" src="/src/elements/tabs.ts"></gbp-api>
