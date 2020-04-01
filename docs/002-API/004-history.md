# History

| 属性                    | 描述                                        |
| ----------------------- | ------------------------------------------- |
| `store`                 | 维护历史记录的 `Store`                      |
| `basePath`              | 指定基本路径(只允许设置一次)                |
| `push`                  | 添加一条历史记录                            |
| `pushIgnoreCloseHandle` | 添加一条历史记录, 忽略类似 modal 的中间页面 |
| `replace`               | 替换当前历史记录                            |
| `getParams`             | 获取当前页面的 `path`, `query`,`hash` 等值  |
| `updateParams`          | 更新 `title` 或者 handle                    |

| 其他            | 描述                              |
| --------------- | --------------------------------- |
| `basePathStore` | `history.basePath` 对应的 `Store` |
