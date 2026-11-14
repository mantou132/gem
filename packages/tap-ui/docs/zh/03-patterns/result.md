# `<tap-pat-result>`

结果页，用于操作成功/失败、缺少权限等整页状态。按钮只发出事件，跳转或关闭由调用方处理。

## Example

<gbp-example name="tap-pat-result" src="https://esm.sh/@mantou/tap-ui/patterns/result">

```json
[
  {
    "style": "width: 100%; height: 400px",
    "status": "success",
    "heading": "支付成功",
    "description": "订单已提交，将在 24 小时内发货。",
    "primary": "查看订单",
    "secondary": "返回首页"
  },
  {
    "style": "width: 100%; height: 400px",
    "status": "error",
    "heading": "提交失败",
    "description": "请检查网络连接后重试。",
    "primary": "重试"
  }
]
```

</gbp-example>

## API

<gbp-api name="tap-pat-result" src="/src/patterns/result.ts"></gbp-api>
