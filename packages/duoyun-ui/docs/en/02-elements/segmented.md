# `<dy-segmented>`

A segmented control is a linear set of two or more segments, each of which functions as a mutually exclusive button. Within the control, all segments are equal in width.

## Example

<gbp-example name="dy-segmented" src="https://esm.sh/duoyun-ui/elements/segmented">

```json
{
  "value": 0,
  "options": [{ "label": "Item" }, { "label": "Item 2" }, { "label": "Item 3" }],
  "@change": "(evt) => evt.target.value = evt.detail"
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/segmented.ts"></gbp-api>
