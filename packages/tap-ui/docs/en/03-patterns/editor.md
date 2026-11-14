# `<tap-pat-editor>`

Single-field edit page, modeled on editing a name in iOS Settings. Suited to opening from a settings row to edit a name, bio, etc.

Done is enabled only after the value changes (and, with `required`, is not blank). Clicking it or pressing Enter only emits `change`; going back or closing is up to the caller.

## Example

<gbp-example name="tap-pat-editor" src="https://esm.sh/@mantou/tap-ui/patterns/editor">

```json
[
  {
    "style": "width: 100%; height: 300px",
    "heading": "Name",
    "value": "Mantou",
    "placeholder": "Name",
    "description": "Shown on your profile.",
    "required": true,
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## With settings

Push it from a `tap-pat-settings` row and pop back after saving.

```ts
import { html } from '@mantou/gem/lib/element';
import { Stack } from '@mantou/tap-ui/elements/stack';

import '@mantou/tap-ui/patterns/editor';

const editName = () => {
  Stack.push({
    gesture: true,
    content: html`
      <tap-pat-editor
        heading="Name"
        back
        required
        value=${name}
        @change=${(evt) => {
          name = evt.detail;
          Stack.pop();
        }}
      ></tap-pat-editor>
    `,
  });
};
```

## API

<gbp-api name="tap-pat-editor" src="/src/patterns/editor.ts"></gbp-api>
