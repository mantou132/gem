# 全局状态管理

WebApp 中多个元素（其他框架中称为组件）之间共享数据很常见，
gem 提供一个订阅-通知模式，让多个元素可以使用同一份数据，并且数据更新时通知所有使用该数据的组件。

基本的订阅-通知模式：

```js
import { createStore, connect, updateStore } from '@mantou/gem';

// 常见 store
const store = createStore({ a: 1 });

// 连接 store
connect(store, function() {
  // store 已经更新
});

// 更新 store
updateStore(store, { a: 2 });
```

`Store` 连接 `GemElement` 时，会注册 `GemElement.update` 方法，
所以，当绑定的 store 更新时，连接的 `GemElement` 会自动更新。
最终，你的 gem 元素就像前一节中那样。
