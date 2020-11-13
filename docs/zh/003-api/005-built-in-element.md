# 内置 Gem 元素

Gem 提供了一些常用的自定义元素, 他们没有默认内置, 需要自己手动引入:

```js
import { html } from '@mantou/gem';
import '@mantou/gem/elements/link';

html`<gem-link path="/page"></gem-link>`;
```

| 自定义元素                       | 描述                                           |
| -------------------------------- | ---------------------------------------------- |
| `<gem-link>`/`<gem-active-link>` | 类似 `<a>`                                     |
| `<gem-route>`                    | 提供路由匹配，可以嵌套                         |
| `<gem-title>`                    | 更新 `document.title` 或者显示在你需要他的地方 |
| `<gem-use>`                      | 类似 SVG 的 `<use>`                            |
| `<gem-unsafe>`                   | 直接将字符串渲染成内容                         |
| `<gem-reflect>`                  | 将内容渲染到指定元素                           |

另外，还有用于开发涉及*历史记录栈*组件的模块：

| 模块                | 描述                                       |
| ------------------- | ------------------------------------------ |
| `createModalClass`  | 一个函数，他能生成一个可以显示 UI 的静态类 |
| `DialogBaseElement` | 一个类，基于他创建 Dialog 元素             |
