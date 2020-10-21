# 重导出

Gem 依赖 [`lit-html`](https://github.com/Polymer/lit-html)，部分 API 被 Gem 重新导出：

| 名称        | 描述                                        |
| ----------- | ------------------------------------------- |
| `html`      | 模版字符串标签，用于创建 HTML lit-html 模版 |
| `svg`       | 模版字符串标签，用于创建 SVG lit-html 模版  |
| `render`    | 挂载 lit-html 模版到 DOM                    |
| `repeat`    | 优化 lit-html 列表渲染指令                  |
| `directive` | 自定义 lit-html 模版渲染指令                |

其他 API 和指令可以从 lit-html 中导入：

```js
import { parts } from 'lit-html';
```
