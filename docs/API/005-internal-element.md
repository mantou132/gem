# 内置 gem 元素

gem 提供了一些常用的自定义元素, 他们没有默认内置, 需要自己手动引入:

```js
import { html } from 'https://dev.jspm.io/@mantou/gem';
import 'https://dev.jspm.io/@mantou/gem/elements/link';
html`
  <gem-link path="/page"></gem-link>
`;
```

| 自定义元素         | 描述                                            |
| ------------------ | ----------------------------------------------- |
| `<gem-link>`       | 类似 `<a>`                                      |
| `<gem-route>`      | 提供路由匹配，可以嵌套                          |
| `<gem-title>`      | 更新 `document.title` 或者显示在你需要他的地方  |
| `<gem-use>`        | 类似 svg 的 `<use>`                             |
| `createModalClass` | 提供一个函数，他能生成单实例 Modal 自定义元素类 |
| `DialogBase`       | 提供一个类，基于他创建 Dialog 元素              |
