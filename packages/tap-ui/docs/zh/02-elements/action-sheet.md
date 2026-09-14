# `<tap-action-sheet>`

动作面板组件。从屏幕底部滑出，供用户在多个操作之间进行选择。

## Example

<gbp-example name="tap-action-sheet" src="https://esm.sh/@mantou/tap-ui/elements/action-sheet">

```json
{
  "heading": "选择操作",
  "description": "请选择您要对该条目执行的操作",
  "groups": [
    {
      "actions": [
        { "label": "分享至好友" },
        { "label": "收藏此内容" },
        { "label": "删除", "danger": true }
      ]
    }
  ],
  "cancel": true
}
```

</gbp-example>

### 命令式调用

```ts
import { ActionSheet } from '@mantou/tap-ui/elements/action-sheet';

await ActionSheet.open({
  heading: '分享',
  groups: [
    {
      actions: [
        { label: '复制链接', onClick: () => console.log('copy') },
        { label: '删除', danger: true, onClick: () => console.log('delete') }
      ]
    }
  ],
  cancel: true
});
```

## API

<gbp-api name="tap-action-sheet" src="/src/elements/action-sheet.ts"></gbp-api>
