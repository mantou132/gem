# `<dy-time-picker>`

A time picker component that allows users to select a specific time. It includes both a picker interface and a panel view, with support for clearing the selection and handling time changes.

## `<dy-time-picker>` Example

<gbp-example name="dy-time-picker" src="https://esm.sh/duoyun-ui/elements/time-picker">

```json
{
  "value": 1644475003294,
  "clearable": true,
  "@clear": "(evt) => evt.target.value = null",
  "@change": "(evt) => evt.target.value = evt.detail"
}
```

</gbp-example>

## `<dy-time-picker>` API

<gbp-api src="/src/elements/time-picker.ts"></gbp-api>

## `<dy-time-panel>` Example

<gbp-example name="dy-time-panel" src="https://esm.sh/duoyun-ui/elements/time-panel">

```json
{
  "style": "width: 10em; height: 200px;",
  "@change": "(evt) => evt.target.value = evt.detail"
}
```

</gbp-example>

## `<dy-time-panel>` API

<gbp-api src="/src/elements/time-panel.ts"></gbp-api>
