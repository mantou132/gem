# 全局状态管理

多个元素（其他框架中称为“组件”）之间共享数据是 WebApp 框架的一项基本能力，
Gem 使用发布订阅模式，让多个元素共享数据，并且数据更新时通知所有订阅该数据的元素。
在 Gem 中，全局数据称为 “Store”。

## 基本使用

```js
// 省略导入...

// 创建 store
const store = createStore({ a: 1 });

// 连接 store
connect(store, function () {
  // store 更新时执行
});

// 更新 store
updateStore(store, { a: 2 });
```

前一节有提到，使用 `static observedStores`/`@connectStore` 来连接 `Store`，
实际上，他们的作用只是注册 `GemElement` 实例的 `update` 方法，
所以，当 `Store` 更新时，连接 `Store` 的 `GemElement` 的实例会调用 `update`，从而实现自动更新。

## 规划 Store

你可能已经注意到，每次更新 `Store` 时，都会更新连接这个 `Store` 的 Gem 元素，
但是很可能元素并没有使用 `Store` 中当前修改的值，所以会发生无效的更新。
你应该花点心思规划你的 `Store`，以避免对 `Store` 的任何更新都造成整个 App 更新。

```js
// 省略导入...

const posts = createStore({ ... });
const users = createStore({ ... });
const photos = createStore({ ... });
const profiles = createStore({ ... });

// ...
```

甚至，你可以将 `Store` 和元素定义在一起。

## 例子

在元素的生命周期中可以很方便的监听 `visibilitychange` 事件，然后在该事件的回调中来切换元素的状态，比如进入节能模式。
如果这个逻辑需要在很多元素中共享使用时，你可以使用 `Store` 轻松完成这个工作。

```js
// 省略导入...

const isSavingMode = () => document.visibilityState !== 'visible';

const store = createStore({ savingMode: isSavingMode() });

document.addEventListener('visibilitychange', () => {
  updateStore({ savingMode: isSavingMode() });
});

@customElement('hello-world')
@connectStore(store)
class HelloWorld extends GemElement {
  render() {
    return html`${store.savingMode}`;
  }
}
```
