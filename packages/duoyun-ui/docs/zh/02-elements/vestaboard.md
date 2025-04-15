# `<dy-vestaboard>`

一个带有动画效果的字符展示组件，灵感来自 Vestaboard 显示屏。

## 例子

<gbp-example name="dy-vestaboard" src="https://esm.sh/duoyun-ui/elements/vestaboard">

```json
{
  "style": "font-size: 3em;font-weight: bold;",
  "char": "A",
  "variant": "polygon",
  "@click": "({target})=>target.char=String.fromCharCode(target.char.codePointAt(0)+1)"
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/vestaboard.ts"></gbp-api>
