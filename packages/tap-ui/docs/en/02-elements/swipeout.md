# `<tap-swipeout>`

Swipe a list item horizontally to reveal actions, like iOS. Put actions in the `start` or `end` slot.
With `enable-long-drag`, dragging far triggers the outermost action and fires `long-drag`,
an element in the `danger` slot is placed at the end and expands to full width when long dragged.

## Example

<gbp-example name="tap-swipeout" src="https://esm.sh/@mantou/tap-ui/elements/swipeout">

```json
{
  "style": "width: 100%;",
  "enableLongDrag": true,
  "innerHTML": "<button slot='start'>Pin</button><button slot='end'>More</button><button slot='danger' style='background: red; color: white'>Delete</button><div style='padding: 1em'>Swipe left or right</div>"
}
```

</gbp-example>

## API

<gbp-api name="tap-swipeout" src="/src/elements/swipeout.ts"></gbp-api>
