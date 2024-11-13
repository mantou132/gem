# History

Gem 导出一个 `history` 对象，它扩展了 [History API](https://developer.mozilla.org/en-US/docs/Web/API/History).

## 属性

| 名称                    | 描述                                        |
| ----------------------- | ------------------------------------------- |
| `store`                 | 维护历史记录的 `Store`                      |
| `basePath`              | 指定基本路径(只允许设置一次)                |
| `push`                  | 添加一条历史记录                            |
| `pushIgnoreCloseHandle` | 添加一条历史记录, 忽略类似 modal 的中间页面 |
| `replace`               | 替换当前历史记录                            |
| `getParams`             | 获取当前页面的 `path`, `query`,`hash` 等值  |
| `updateParams`          | 更新 `title` 或者 `handle`                  |
| `basePathStore`         | `history.basePath` 对应的 `Store`           |

## Other

| 名称            | 描述                         |
| --------------- | ---------------------------- |
| `titleStore`    | 文档标题                     |
| `basePathStore` | 导出 `history.basePathStore` |