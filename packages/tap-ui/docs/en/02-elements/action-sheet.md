# `<tap-action-sheet>`

Action Sheet component. Slides up from the bottom of the screen, allowing users to choose between multiple actions.

## Example

<gbp-example name="tap-action-sheet" src="https://esm.sh/@mantou/tap-ui/elements/action-sheet">

```json
{
  "heading": "Choose Action",
  "description": "Please choose an action to perform on this item",
  "groups": [
    {
      "actions": [
        { "label": "Share to Friends" },
        { "label": "Add to Favorites" },
        { "label": "Delete", "danger": true }
      ]
    }
  ],
  "cancel": true
}
```

</gbp-example>

### Imperative Calling

```ts
import { ActionSheet } from '@mantou/tap-ui/elements/action-sheet';

await ActionSheet.open({
  heading: 'Share',
  groups: [
    {
      actions: [
        { label: 'Copy Link', onClick: () => console.log('copy') },
        { label: 'Delete', danger: true, onClick: () => console.log('delete') }
      ]
    }
  ],
  cancel: true
});
```

## API

<gbp-api name="tap-action-sheet" src="/src/elements/action-sheet.ts"></gbp-api>
