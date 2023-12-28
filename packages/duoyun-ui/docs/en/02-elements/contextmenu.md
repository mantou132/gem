# `<dy-contextmenu>`

## Example

<gbp-example name="dy-button" src="https://esm.sh/duoyun-ui/elements/contextmenu,https://esm.sh/duoyun-ui/elements/button">

```json
{
  "@click": "(e)=>{customElements.get('dy-contextmenu').open([{text:'Add',},{text:'Edit',},{text:'---',},{text:'Delete',danger:true,},],{activeElement:e.target});}",
  "innerHTML": "Open ContextMenu"
}
```

</gbp-example>

```ts
import { ContextMenu } from 'duoyun-ui/elements/contextmenu';

const onClick = (e: MouseEvent) => {
  ContextMenu.open(
    [
      {
        text: 'Add',
      },
      {
        text: 'Edit',
      },
      {
        text: '---',
      },
      {
        text: 'Delete',
        danger: true,
      },
    ],
    { activeElement: e.target },
  );
};
```

## API

<gbp-api src="/src/elements/contextmenu.ts"></gbp-api>
