# `<dy-tooltip>`

A tooltip component that displays additional information when users hover over or click on an element. It supports different trigger modes and positioning options to provide contextual help or extra details.

## Example

<gbp-example name="dy-tooltip" src="https://esm.sh/duoyun-ui/elements/tooltip,https://esm.sh/duoyun-ui/elements/button">

```json
[
  {
    "innerHTML": "<dy-button>Hover</dy-button>",
    "content": "Tooltip text",
    "unreachable": true
  },
  {
    "innerHTML": "<dy-button>Click</dy-button>",
    "content": "Tooltip text",
    "position": "topRight",
    "trigger": "click"
  }
]
```

</gbp-example>

## API

<gbp-api src="/src/elements/tooltip.ts"></gbp-api>
