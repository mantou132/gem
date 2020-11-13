# Store

| API 名称         | 描述                                                          |
| ---------------- | ------------------------------------------------------------- |
| `createStore`    | 创建一个 `Store`                                              |
| `createStoreSet` | 一次性创建多个 `Store`                                        |
| `updateStore`    | 使用 `Object.assign` 更新一个 `Store`                         |
| `connect`        | 将一个回调函数连接到 `Store`, 当 `Store` 更新时会异步进行调用 |
| `disconnect`     | 将一个回调函数从 `Store` 断开连接                             |
