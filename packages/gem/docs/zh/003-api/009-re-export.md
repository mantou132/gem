# 重导出

Gem 依赖 [`lit-html`](https://lit.dev/docs/templates/overview/)，部分 API 被 Gem 重新导出：

| 名称        | 描述                                        |
| ----------- | ------------------------------------------- |
| `html`      | 模版字符串标签，用于创建 HTML lit-html 模版 |
| `svg`       | 模版字符串标签，用于创建 SVG lit-html 模版  |
| `render`    | 挂载 lit-html 模版到 DOM                    |
| `directive` | 自定义 lit-html 模版渲染指令                |
| `repeat`    | 优化 lit-html 列表渲染指令                  |

其他指令可以从 lit-html 中导入：

```js
import { cache } from 'lit-html/directives/cache';
```
