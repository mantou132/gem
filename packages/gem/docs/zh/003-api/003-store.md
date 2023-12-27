# Store

| API 名称      | 描述                                                          |
| ------------- | ------------------------------------------------------------- |
| `createStore` | 创建一个 `Store`                                              |
| `updateStore` | 使用 `Object.assign` 更新一个 `Store`                         |
| `useStore`    | 创建一个 `Store`，返回包括更新函数                            |
| `connect`     | 将一个回调函数连接到 `Store`, 当 `Store` 更新时会异步进行调用 |
| `disconnect`  | 将一个回调函数从 `Store` 断开连接                             |
