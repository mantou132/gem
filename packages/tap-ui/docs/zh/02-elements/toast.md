# `<tap-toast>`

轻量级提示组件。提供不同语义类型（info、success、warning、error、loading）、自定义操作按钮以及命令式静态方法调用。

## Example

<gbp-example name="tap-button" src="https://esm.sh/@mantou/tap-ui/elements/toast, https://esm.sh/@mantou/tap-ui/elements/button">

```json
[
  {
    "innerHTML": "Success",
    "color": "positive",
    "@click": "()=>customElements.get('tap-toast').open('success', '这是一条消息')"
  },
  {
    "innerHTML": "Warning",
    "color": "notice",
    "@click": "()=>customElements.get('tap-toast').open('warning', '这是一条消息')"
  },
  {
    "innerHTML": "Error",
    "color": "negative",
    "@click": "()=>customElements.get('tap-toast').open('error', '这是一条消息')"
  }
]
```

</gbp-example>

### 命令式调用

```ts
import { Toast } from '@mantou/tap-ui/elements/toast';

Toast.open('success', '这是一条消息');

Toast.open({
  type: 'info',
  content: '支持操作按钮',
  action: {
    text: '撤销',
    handle: () => console.log('undo'),
  },
});
```

## API

<gbp-api name="tap-toast" src="/src/elements/toast.ts"></gbp-api>
