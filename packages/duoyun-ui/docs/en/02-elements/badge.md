# `<dy-badge>`

Badges are small status descriptors for UI elements. A badge consists of a small circle, typically containing a number or other short set of characters, that appears in proximity to another object.

## Example

<gbp-example name="dy-badge"  src="https://esm.sh/duoyun-ui/elements/badge,https://esm.sh/duoyun-ui/elements/avatar">

```json
[
  {
    "count": "New"
  },
  {
    "dot": true,
    "innerHTML": "This is Link"
  },
  {
    "count": 5,
    "innerHTML": "<dy-avatar src=https://api.dicebear.com/5.x/bottts-neutral/svg></dy-avatar>"
  },
  {
    "icon": "icons.delete",
    "color": "informative",
    "innerHTML": "<dy-avatar src=https://api.dicebear.com/5.x/bottts-neutral/svg></dy-avatar>"
  },
  {
    "count": 199,
    "max": 99,
    "color": "positive",
    "innerHTML": "<dy-avatar src=https://api.dicebear.com/5.x/bottts-neutral/svg></dy-avatar>"
  }
]
```

</gbp-example>

## API

<gbp-api name="dy-badge" src="/src/elements/badge.ts"></gbp-api>
