# History

Gem 导出 `history` 对象，在 [History API](https://developer.mozilla.org/en-US/docs/Web/API/History) 之上提供应用路由能力。

## 属性和方法

| 名称                            | 类型 | 描述                                                                |
| ------------------------------- | ---- | ------------------------------------------------------------------- |
| `store`                         | 属性 | 保存当前历史记录状态的 Store                                        |
| `currentKey`                    | 属性 | 当前历史记录的 key                                                  |
| `basePath`                      | 属性 | 读取或设置应用基础路径；应在应用初始化时设置                        |
| `getParams()`                   | 方法 | 获取当前记录的 `path`、`query`、`hash` 等参数                       |
| `updateParams(params)`          | 方法 | 更新当前记录的 `title`，不会修改 URL；需要修改 URL 时请用 `replace` |
| `push(params)`                  | 方法 | 添加一条历史记录                                                    |
| `pushIgnoreCloseHandle(params)` | 方法 | 当前记录带关闭处理函数时关闭并替换它，否则正常添加记录              |
| `replace(params)`               | 方法 | 替换当前历史记录                                                    |
| `back()` / `forward()`          | 方法 | 跳转到上一条或下一条历史记录                                        |

`params` 使用 `UpdateHistoryParams`，包括 `path`、`query`、`hash`、`title`、`data` 和可选的 modal 处理函数（`open`、`close`、`shouldClose`）。

## 相关导出

| 名称            | 描述                             |
| --------------- | -------------------------------- |
| `titleStore`    | 文档标题对应的 Store             |
| `basePathStore` | 保存 `history.basePath` 的 Store |
