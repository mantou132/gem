# 全局状态管理

WebApp 中多个元素（其他框架中称为组件）之间共享数据很常见，
Gem 提供一个“订阅-通知”模式，让多个元素可以使用同一份数据，并且数据更新时通知所有使用该数据的组件。

使用“订阅-通知”：

```js
import { createStore, connect, updateStore } from '@mantou/gem';

// 创建 store
const store = createStore({ a: 1 });

// 连接 store
connect(store, function() {
  // store 更新时执行
});

// 更新 store
updateStore(store, { a: 2 });
```

前一节有提到，使用 `static observedStores`/`@connectStore` 来连接 `Store`，
实际上，他们的作用只是注册 `GemElement` 实例的 `update` 方法，
所以，当 `Store` 更新时，连接 `Store` 的 `GemElement` 的实例会自动更新。
