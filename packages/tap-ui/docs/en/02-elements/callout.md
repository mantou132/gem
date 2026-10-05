# `<tap-callout>`

Long-press menu component. Long pressing lifts the content in place, blurs and dims the background, and shows a menu below it.

## Example

<gbp-example name="tap-callout" src="https://esm.sh/@mantou/tap-ui/elements/callout">

```json
{
  "innerHTML": "<div style=\"display: inline-block; padding: 0.75em 1em; border-radius: 1em; color: #fff; background: #536dfe\">Long press me</div>",
  "menu": [
    { "label": "Copy" },
    { "label": "Favorite" },
    { "label": "Delete", "danger": true }
  ]
}
```

</gbp-example>

A menu item's `handle` runs after the menu closes, so it can open other popups.

```ts
import { icons } from '@mantou/tap-ui/lib/icons';

html`
  <tap-callout
    .menu=${[
      { label: 'Copy', icon: icons.copy, handle: copy },
      { label: 'Delete', icon: icons.delete, danger: true, handle: remove },
    ]}
  >
    <div>Message content</div>
  </tap-callout>
`;
```

### Showing a Preview

Use `Callout.open` when the long press should show a preview that differs from the original content, such as the full message or an enlarged image. The preview expands from the position of `target`, the original content stays in place, and the menu is shown below the preview.

```ts
import { Callout } from '@mantou/tap-ui/elements/callout';
import { longPress } from '@mantou/tap-ui/lib/directives';

const ref = createRef<HTMLElement>();

html`
  <div
    ${ref}
    ${longPress(() =>
      Callout.open({
        target: ref.value!,
        preview: html`<message-preview></message-preview>`,
        menu: [{ label: 'Copy', handle: copy }],
      }),
    )}
  >
    Message content
  </div>
`;
```

> [!NOTE]
> The preview is rendered inside the Shadow DOM of `<tap-callout>`, so outside styles don't apply to it. Use an element that carries its own styles as the preview.

## API

<gbp-api name="tap-callout" src="/src/elements/callout.ts"></gbp-api>
