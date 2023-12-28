# `<dy-contextmenu>`

## Example

<gbp-example name="dy-button" src="https://esm.sh/duoyun-ui/elements/contextmenu,https://esm.sh/duoyun-ui/elements/button">

```json
{
  "@click": "(e)=>{customElements.get('dy-contextmenu').open([{text:'新增',},{text:'编辑',},{text:'---',},{text:'删除',danger:true,},],{activeElement:e.target});}",
  "innerHTML": "打开上下文菜单"
}
```

</gbp-example>

```ts
import { ContextMenu } from 'duoyun-ui/elements/contextmenu';

const onClick = (e: MouseEvent) => {
  ContextMenu.open(
    [
      {
        text: '新增',
      },
      {
        text: '编辑',
      },
      {
        text: '---',
      },
      {
        text: '删除',
        danger: true,
      },
    ],
    { activeElement: e.target },
  );
};
```

## API

<gbp-api src="/src/elements/contextmenu.ts"></gbp-api>
