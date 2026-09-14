# `<tap-dialog>`

模态对话框组件。提供标题、内容、确定和取消按钮，并支持静态方法命令式调用。

## Example

<gbp-example name="tap-dialog" src="https://esm.sh/@mantou/tap-ui/elements/dialog, https://esm.sh/@mantou/tap-ui/elements/button">

```json
[
  {
    "tagName": "tap-button",
    "innerHTML": "打开对话框",
    "@click": "(evt) => (evt.target.nextElementSibling.open = true)"
  },
  {
    "open": true,
    "maskClosable": true,
    "header": "操作确认",
    "body": "确定要执行此项操作吗？此操作无法撤销。",
    "okText": "确认",
    "cancelText": "取消",
    "@close": "(evt) => (evt.target.open = false)",
    "@ok": "(evt) => (evt.target.open = false)",
    "@maskclick": "(evt) => (evt.target.open = false)"
  }
]
```

</gbp-example>

### 命令式调用

```ts
import { TapDialogElement } from '@mantou/tap-ui/elements/dialog';

// 打开普通对话框
TapDialogElement.open({
  header: '提示',
  body: '操作已成功完成！',
});

// 确认对话框
TapDialogElement.confirm({
  header: '警告',
  body: '此操作将永久删除数据，是否继续？',
  dangerDefaultOkBtn: true,
  onOk: () => {
    console.log('用户确认了操作');
  },
});
```

## API

<gbp-api name="tap-dialog" src="/src/elements/dialog.ts"></gbp-api>
