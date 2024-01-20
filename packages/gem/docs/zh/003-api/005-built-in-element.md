# 内置 Gem 元素

Gem 提供了一些常用的自定义元素, 他们没有默认内置, 需要自己手动引入:

```js
import { html } from '@mantou/gem';
import '@mantou/gem/elements/link';

html`<gem-link path="/page"></gem-link>`;
```

## `<gem-link>`

类似 `<a>`，支持引用路由。

<gbp-api name="gem-link" src="/src/elements/base/link.ts"></gbp-api>

## `<gem-active-link>`

<gbp-api name="gem-active-link" src="/src/elements/base/link.ts"></gbp-api>

## `<gem-route>`

提供路由匹配，可以嵌套。

<gbp-api name="gem-route" src="/src/elements/base/route.ts"></gbp-api>

<gbp-api src="/src/elements/base/route.ts"></gbp-api>

## `<gem-light-route>`

<gbp-api name="gem-light-route" src="/src/elements/base/route.ts"></gbp-api>

## `<gem-title>`

更新 `document.title` 或者显示在你需要他的地方。

<gbp-api name="gem-title" src="/src/elements/base/title.ts"></gbp-api>

## `<gem-use>`

类似 SVG 的 `<use>`。

<gbp-api name="gem-use" src="/src/elements/base/use.ts"></gbp-api>

## `<gem-reflect>`

直接将字符串渲染成内容。

<gbp-api name="gem-reflect" src="/src/elements/base/reflect.ts"></gbp-api>

## `<gem-gesture>`

提供基本的手势支持，支持 `pan`, `pinch`, `rotate`, `swipe`, `press`, `end` 手势事件。

<gbp-api name="gem-gesture" src="/src/elements/base/gesture.ts"></gbp-api>

## `<gem-unsafe>`

直接将字符串在安全容器中渲染成 HTML/SVG 内容。

<gbp-api name="gem-unsafe" src="/src/elements/base/unsafe.ts"></gbp-api>

## 其他

还有用于开发涉及*历史记录栈*组件的模块：

| 模块                | 描述                                       |
| ------------------- | ------------------------------------------ |
| `createModalClass`  | 一个函数，他能生成一个可以显示 UI 的静态类 |
| `DialogBaseElement` | 一个类，基于他创建 Dialog 元素             |
