# `<tap-callout>`

长按菜单组件。长按内容时内容原地浮起，背景模糊变暗，下方显示菜单。

## Example

<gbp-example name="tap-callout" src="https://esm.sh/@mantou/tap-ui/elements/callout">

```json
{
  "innerHTML": "<div style=\"display: inline-block; padding: 0.75em 1em; border-radius: 1em; color: #fff; background: #536dfe\">长按我</div>",
  "menu": [
    { "label": "复制" },
    { "label": "收藏" },
    { "label": "删除", "danger": true }
  ]
}
```

</gbp-example>

菜单项的 `handle` 在菜单关闭后执行，此时可以打开其他弹层。

```ts
import { icons } from '@mantou/tap-ui/lib/icons';

html`
  <tap-callout
    .menu=${[
      { label: '复制', icon: icons.copy, handle: copy },
      { label: '删除', icon: icons.delete, danger: true, handle: remove },
    ]}
  >
    <div>消息内容</div>
  </tap-callout>
`;
```

### 展示预览

当长按后需要展示和原内容不同的预览（例如完整的消息、放大的图片）时，使用 `Callout.open`。预览从 `target` 的位置展开，原内容留在原处，菜单显示在预览下方。

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
        menu: [{ label: '复制', handle: copy }],
      }),
    )}
  >
    消息内容
  </div>
`;
```

> [!NOTE]
> 预览渲染在 `<tap-callout>` 的 Shadow DOM 中，外部样式无法作用到预览内容，建议使用自带样式的元素作为预览。

## API

<gbp-api name="tap-callout" src="/src/elements/callout.ts"></gbp-api>
