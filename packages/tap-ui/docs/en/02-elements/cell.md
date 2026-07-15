# `<tap-cell>`

Settings-style list row and group. Primary text on the left; description, switch, or other content on the right. Use `action` to show a trailing chevron.

## Example

<gbp-example name="tap-cell" src="https://esm.sh/tap-ui/elements/cell">

```json
{
  "label": "Name",
  "description": "Mantou",
  "action": true
}
```

</gbp-example>

<gbp-example name="tap-cell-group" src="https://esm.sh/tap-ui/elements/cell">

```json
{
  "heading": "Account",
  "items": [
    { "label": "Profile", "action": true },
    { "label": "Name", "description": "Mantou", "action": true },
    { "label": "Auto save photos", "checked": true }
  ],
  "@change": "({ target, detail }) => { detail.item.checked = detail.checked; target.items = [...target.items] }",
  "@itemclick": "({ detail }) => console.log(detail.label)"
}
```

</gbp-example>

## `<tap-cell>` API

<gbp-api name="tap-cell" src="/src/elements/cell.ts"></gbp-api>

## `<tap-cell-group>` API

<gbp-api name="tap-cell-group" src="/src/elements/cell.ts"></gbp-api>
