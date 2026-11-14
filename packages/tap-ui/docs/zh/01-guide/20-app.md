# Web 应用

TapUI 提供了搭建移动端 Web 应用的辅助函数，在 Tauri、Capacitor 等混合应用中同样适用。

## 初始化应用

`initApp` 会设置 viewport，禁用双指缩放和过度滚动，让 body 保持在虚拟键盘之上，
并将 `template` 渲染为全局 [`Stack`](../02-elements/stack.md) 的根页面：

```ts
import { initApp } from '@mantou/tap-ui/helper/webapp';

initApp({
  template: html`<my-app></my-app>`,
});
```

选项：
- `template`：全局 `Stack` 的根页面
- `layout`：代替根页面渲染到 `body` 中，用于在堆栈旁边放置布局（例如分栏视图的侧边栏），其中的 `<tap-stack>` 成为全局 `Stack`
- `onRootClose`：关闭根页面时（`Stack.pop()` 或在根页面上滑动返回）调用，例如退出应用
- `serviceWorkerScript`：注册 Service Worker，不设置时会注销已注册的 Service Worker

## Web 应用清单

`getWebManifestURL` 将清单对象转换为 data URL，其中的相对路径基于当前源解析。
使用 `<tap-reflect>`（同 [`<gem-reflect>`](https://gemjs.org/zh/api/built-in-element#gem-reflect)）将它渲染到 `<head>` 中：

```ts
import { getWebManifestURL, initApp } from '@mantou/tap-ui/helper/webapp';

initApp({
  template: html`
    <tap-reflect>
      <link rel="manifest" href=${getWebManifestURL({ name: 'My App', start_url: '/', display: 'fullscreen' })} />
    </tap-reflect>
    <my-app></my-app>
  `,
});
```

## 错误处理

导入 `@mantou/tap-ui/helper/error` 来处理未捕获的错误和未处理的 Promise 拒绝，
默认只打印日志，可以使用 `errorHandler` 自定义：

```ts
import { errorHandler } from '@mantou/tap-ui/helper/base/error';
import { Toast } from '@mantou/tap-ui/elements/toast';

import '@mantou/tap-ui/helper/error';

errorHandler.ignoreRules.push(/NetworkError/);
errorHandler.show = (message) => Toast.open('error', message);
```
