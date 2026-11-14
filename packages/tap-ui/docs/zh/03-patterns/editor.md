# `<tap-pat-editor>`

单字段编辑页，交互参考 iOS 设置中编辑名称。适合从设置行进入编辑名称、简介等。

值改变后（设置 `required` 时还需非空）完成按钮才可用，点击完成或回车后只发出 `change`，返回或关闭由调用方处理。

## Example

<gbp-example name="tap-pat-editor" src="https://esm.sh/@mantou/tap-ui/patterns/editor">

```json
[
  {
    "style": "width: 100%; height: 300px",
    "heading": "名称",
    "value": "Mantou",
    "placeholder": "名称",
    "description": "显示在你的个人资料中。",
    "required": true,
    "@change": "(evt) => evt.target.value = evt.detail"
  }
]
```

</gbp-example>

## 配合设置页

从 `tap-pat-settings` 的行进入，保存后返回。

```ts
import { html } from '@mantou/gem/lib/element';
import { Stack } from '@mantou/tap-ui/elements/stack';

import '@mantou/tap-ui/patterns/editor';

const editName = () => {
  Stack.push({
    gesture: true,
    content: html`
      <tap-pat-editor
        heading="名称"
        back
        required
        value=${name}
        @change=${(evt) => {
          name = evt.detail;
          Stack.pop();
        }}
      ></tap-pat-editor>
    `,
  });
};
```

## API

<gbp-api name="tap-pat-editor" src="/src/patterns/editor.ts"></gbp-api>
