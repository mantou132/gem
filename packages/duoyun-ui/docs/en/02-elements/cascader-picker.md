# `<dy-cascader-picker>`

A cascading selector that allows users to select from a tree-like set of options. It supports both single and multiple selection modes, and can be configured to display the full path of selected items.

## `<dy-cascader-picker>` Example

<gbp-example name="dy-cascader-picker" src="https://esm.sh/duoyun-ui/elements/cascader-picker">

```json
{
  "placeholder": "Please choose",
  "multiple": true,
  "value": [["Option 2"]],
  "options": [
    {
      "label": "Option 1",
      "children": [
        {
          "label": "Option 1.1"
        }
      ]
    },
    {
      "label": "Option 2"
    },
    {
      "label": "Option 3"
    }
  ],
  "@change": "(evt) => evt.target.value = evt.detail"
}
```

</gbp-example>

## `<dy-cascader-picker>` API

<gbp-api src="/src/elements/cascader-picker.ts"></gbp-api>

## `<dy-cascader>` Example

<gbp-example name="dy-cascader" src="https://esm.sh/duoyun-ui/elements/cascader">

```json
{
  "style": "width: 100%",
  "placeholder": "Please choose",
  "value": ["Option 2"],
  "options": [
    {
      "label": "Option 1",
      "children": [
        {
          "label": "Option 1.1"
        }
      ]
    },
    {
      "label": "Option 2"
    },
    {
      "label": "Option 3"
    }
  ]
}
```

</gbp-example>

## `<dy-cascader>` API

<gbp-api src="/src/elements/cascader.ts"></gbp-api>
