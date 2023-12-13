# `<dy-pagination>`

## Example

<gbp-example name="dy-pagination" src="https://jspm.dev/duoyun-ui/elements/pagination">

```json
{
  "page": 2,
  "size": 20,
  "total": 35,
  "sizes": [20, 50, 100],
  "@sizechange": "(evt) => evt.target.size = evt.detail",
  "@pagechange": "(evt) => evt.target.page = evt.detail"
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/pagination.ts"></gbp-api>
