# `<dy-table>`

A table component that displays data in rows and columns. It supports features like selectable rows, tooltips, and customizable column widths.

## Example

<gbp-example name="dy-table" src="https://esm.sh/duoyun-ui/elements/table">

```json
{
  "columns": [
    { "title": "Name", "dataIndex": "name", "width": "20%" },
    { "title": "Email", "dataIndex": "email", "tooltip": "Tooltip" }
  ],
  "data": [
    { "name": "Foo", "email": "foo@bar.com" },
    { "name": "Bar", "email": "bar@foo.com" }
  ],
  "selectable": true,
  "@select": "(evt) => evt.target.selection = evt.detail"
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/table.ts"></gbp-api>
