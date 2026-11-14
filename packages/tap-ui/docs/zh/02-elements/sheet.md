# `<tap-sheet>`

带拖动条的底部面板，下拉或点击遮罩关闭，支持吸附点。

## Example

```ts
import { Sheet } from '@mantou/tap-ui/elements/sheet';

// 关闭后完成
await Sheet.open({
  header: 'Sheet',
  body: html`<p>Pull down or tap the mask to dismiss.</p>`,
  maskClosable: true,
});

// 吸附在 45% 和 90% 高度（`snap: [0.45, 0.9]`），完全展开时内容才能滚动
Sheet.open({
  header: 'Snap Sheet',
  body: html`...`,
  snap: true,
});
```

也可以写在模版中：

```ts
html`
  <tap-sheet ?open=${open} header="Sheet" mask-closable @close=${onClose}>...</tap-sheet>
`;
```

## API

<gbp-api name="tap-sheet" src="/src/elements/sheet.ts"></gbp-api>
