# `<tap-pat-form>`

多字段表单页，例如编辑资料、新建条目。传入 `groups` 渲染分组的行，标签在左、控件在右，无需手写 `tap-cell` 和控件布局。单个字段请用 `<tap-pat-editor>`。

值改变且所有 `required` 字段已填写后完成按钮才可用，点击后只发出携带完整值的 `change`，返回或关闭由调用方处理。

## Example

<gbp-example name="tap-pat-form" src="https://esm.sh/@mantou/tap-ui/patterns/form">

```json
[
  {
    "style": "width: 100%; height: 600px",
    "heading": "编辑资料",
    "value": { "name": "Mantou", "gender": "male", "notify": true, "count": 1 },
    "groups": [
      {
        "items": [
          { "name": "name", "label": "名称", "required": true },
          { "name": "email", "label": "邮箱", "type": "email", "placeholder": "name@example.com" },
          {
            "name": "gender",
            "label": "性别",
            "type": "select",
            "options": [{ "label": "男", "value": "male" }, { "label": "女", "value": "female" }]
          },
          { "name": "birthday", "label": "生日", "type": "date" }
        ]
      },
      {
        "heading": "偏好",
        "footer": "通知将通过邮件发送。",
        "items": [
          { "name": "notify", "label": "通知", "type": "switch" },
          { "name": "count", "label": "份数", "type": "stepper", "min": 1, "max": 9 }
        ]
      },
      { "items": [{ "name": "bio", "label": "简介", "type": "textarea" }] }
    ],
    "@change": "(evt) => { console.log(evt.detail); evt.target.value = evt.detail }"
  }
]
```

</gbp-example>

## API

<gbp-api name="tap-pat-form" src="/src/patterns/form.ts"></gbp-api>
