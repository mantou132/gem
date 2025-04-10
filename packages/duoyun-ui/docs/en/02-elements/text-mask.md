# `<dy-text-mask>`

A text masking component that formats and masks text content according to specified patterns. It's commonly used for displaying sensitive information or formatting data like phone numbers.

## Example

<gbp-example name="dy-text-mask" src="https://esm.sh/duoyun-ui/elements/text-mask">

```json
[
  {
    "innerHTML": "13198761234",
    "masks": ["☎️ xxx-****-xxxx"]
  },
  {
    "innerHTML": "13198761234",
    "masks": ["☎️ ###-####-xxxx"],
    "replacer": "#"
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/text-mask.ts"></gbp-api>
