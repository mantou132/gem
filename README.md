[![Build Status](https://travis-ci.org/mantou132/gem.svg?branch=master)](https://travis-ci.org/mantou132/gem)

# gem

创建自定义元素, 绑定数据, 路由切换, 快速基于 WebComponents 开发 WebApp。
从 [mt-music-player](https://github.com/mantou132/mt-music-player) 中剥离出来。

## 开始

```js
import { GemElement, createStore, updateStore, html } from 'https://dev.jspm.io/@mantou/gem';

// 新建全局数据对象
const store = createStore({
  a: 1,
});

// 定义自定义元素
customElements.define(
  'app-root',
  class extends GemElement {
    static observedStores = [store];
    clickHandle = () => {
      updateStore(store, { a: ++store.a });
    };
    render() {
      return html`
        <button @click="${this.clickHandle}">Hello, World</button>
        <div>store.a: ${store.a}</div>
      `;
    }
  },
);

// 插入 html
document.body.append(document.createElement('app-root'));
```

## 特色

### 轻巧

整个框架分为三个模块（自定义元素, 全局数据管理, 路由）, 只有 3 个文件, 而且可以分开单独使用。
内置的自定义元素也可以自己选择是否使用。

### 简单

没有全新的语法, 一切都是 html, css, js 。
没有多余的概念, 只需要 "observe" 就能创建交互式的自定义元素;

### 高性能

模版引擎使用 [lit-html](https://github.com/Polymer/lit-html),
打包文件大小, 增删改查的性能以及内存占有都要优于 React, Vue,
[这里](https://rawgit.com/krausest/js-framework-benchmark/master/webdriver-ts-results/table.html)是 lit-html 和 React, Vue 的性能比较

### 异步渲染

包含一个 `AsyncGemElement` 类, 连续渲染（例如创建列表）该类元素时会避免长时间阻塞主线程, 提供流畅的用户体验

### 支持返回键

下拉菜单, 抽屉式菜单, 弹窗能像原生 App 一样通过返回键关闭，并且还能在关闭前类似确认的动作

## API

### Store 相关

| API 名称       | 描述                                                          |
| -------------- | ------------------------------------------------------------- |
| createStore    | 创建一个 `Store`                                              |
| createStoreSet | 一次性创建多个 `Store`                                        |
| updateStore    | 使用 `Object.assign` 更新一个 `Store`                         |
| connect        | 将一个回调函数连接到 `Store`, 当 `Store` 更新时会异步进行调用 |
| disconnect     | 将一个回调函数从 `Store` 断开连接                             |

### GemElement

| 静态字段           | 描述                                                                |
| ------------------ | ------------------------------------------------------------------- |
| observedAttributes | 监听指定的 `attribute`, 当被监听的 `attribute` 变化时元素将自动更新 |
| observedPropertys  | 监听指定的 `property`, 当被监听的 `property` 变化时元素将自动更新   |
| observedStores     | 监听指定的 `Store`, 当被监听的 `Store` 变化时元素将自动更新         |
| adoptedStyleSheets | 同 `DocumentOrShadowRoot.adoptedStyleSheets`(注意兼容性)            |

| 生命周期         | 描述                                        |
| ---------------- | ------------------------------------------- |
| willMount        | 挂载元素前的回调                            |
| mounted          | 挂载元素后的回调                            |
| shouldUpdate     | 更新元素前的回调, 返回 `false` 时不更新元素 |
| updated          | 更新元素后的回调                            |
| attributeChanged | 更新元素 `attribute` 的回调                 |
| unmounted        | 卸载元素后的回调                            |

| 只读方法         | 描述                                              |
| ---------------- | ------------------------------------------------- |
| setState         | 使用 `Object.assign` 更新 `State`, 并自动触发更新 |
| update           | 重新调用 render 并更新元素                        |
| disconnectStores | 断开元素监听的 `Store`                            |

| 其他   | 描述                              |
| ------ | --------------------------------- |
| render | 渲染元素                          |
| state  | 指定元素 `State`, 通过 `setState` |

### AsyncGemElement

和 `GemElement` 不同的是, 会使用 `requestAnimationFrame` 进行异步渲染, 不会阻塞主线程

### history

| 属性                   | 描述                                        |
| ---------------------- | ------------------------------------------- |
| historyState           | 维护历史记录的 `Store`                      |
| basePath               | 指定基本路径                                |
| forward                |                                             |
| back                   |                                             |
| push                   | 添加一条历史记录                            |
| pushWithoutCloseHandle | 添加一条历史记录, 排除类似 modal 的中间页面 |
| pushState              | 添加一条相同 URL 的历史记录                 |
| replace                | 替换当前历史记录                            |
| replaceState           | 替换当前历史记录的非 URL 属性               |
