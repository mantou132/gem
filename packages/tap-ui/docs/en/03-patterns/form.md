# `<tap-pat-form>`

Multi-field form page, such as editing a profile or creating an item. Pass `groups` to render grouped rows with the label on the left and the control on the right; no need to lay out `tap-cell` and controls by hand. For a single field use `<tap-pat-editor>`.

Done is enabled only after a value changes and all `required` fields are filled. Clicking it only emits `change` with the full value; going back or closing is up to the caller.

## Example

<gbp-example name="tap-pat-form" src="https://esm.sh/@mantou/tap-ui/patterns/form">

```json
[
  {
    "style": "width: 100%; height: 600px",
    "heading": "Edit Profile",
    "value": { "name": "Mantou", "gender": "male", "notify": true, "count": 1 },
    "groups": [
      {
        "items": [
          { "name": "name", "label": "Name", "required": true },
          { "name": "email", "label": "Email", "type": "email", "placeholder": "name@example.com" },
          {
            "name": "gender",
            "label": "Gender",
            "type": "select",
            "options": [
              { "label": "Male", "value": "male" },
              { "label": "Female", "value": "female" }
            ]
          },
          { "name": "birthday", "label": "Birthday", "type": "date" }
        ]
      },
      {
        "heading": "Preferences",
        "footer": "Notifications are sent by email.",
        "items": [
          { "name": "notify", "label": "Notifications", "type": "switch" },
          { "name": "count", "label": "Copies", "type": "stepper", "min": 1, "max": 9 }
        ]
      },
      { "items": [{ "name": "bio", "label": "Bio", "type": "textarea" }] }
    ],
    "@change": "(evt) => { console.log(evt.detail); evt.target.value = evt.detail }"
  }
]
```

</gbp-example>

## API

<gbp-api name="tap-pat-form" src="/src/patterns/form.ts"></gbp-api>
