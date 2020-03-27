# 全局状态管理

WebApp 中多个元素（其他框架中称为组件）之间共享数据很常见，
Gem 提供一个“订阅-通知”模式，让多个元素可以使用同一份数据，并且数据更新时通知所有使用该数据的组件。

## 基本使用

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

## 规划 Store

你可能已经注意到，每次更新 `Store` 时，都会更新链接这个 `Store` 的 Gem 元素，
但是很可能元素并没有使用 `Store` 中当前修改的值，所以你应该花点心思规划你的 `Store`，
以避免任何更新都造成整个 App 更新。

```js
const posts = createStore({ ... });
const users = createStore({ ... });
const photos = createStore({ ... });
const profiles = createStore({ ... });

...
```

甚至，你可以将 `Store` 和元素定义在一起。
