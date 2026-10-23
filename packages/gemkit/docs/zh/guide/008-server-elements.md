# 服务端元素

Gemkit 可以把页面拆成服务端渲染、按需加载和只在浏览器运行的几种部分。
装饰器来自 [gem-ssr](https://github.com/mantou132/gem/tree/main/packages/gem-ssr)，
由 `@mantou/gemkit` 重新导出。

## `@server()`

用 `@server()` 标记的类只在服务端渲染，它的代码和依赖不会打包到客户端，
所以可以使用 Node.js API 和只能在服务端使用的包。输出的 HTML 保留在页面中，客户端不加载代码，也不水合。

```ts
@customElement('app-stars')
@server()
class AppStarsElement extends GemElement {
  @template()
  #content = () => html`<span>${countStars()}</span>`;
}
```

渲染之后没有客户端行为。适合在浏览器中不会改变，并且发送给每个用户成本较高的内容。

`@server()` 也可以标记方法或者字段。它在服务端渲染时执行，执行后的状态随元素一起输出，
水合时直接使用，并跳过第一次执行。值必须可以序列化成 JSON。

## `@lazy()`

用 `@lazy()` 标记的元素在服务端渲染，客户端加载代码并水合之前一直显示服务端的 HTML。
代码会打包到单独的客户端 chunk 中，所以只能使用同构的代码。

```ts
@customElement('app-like-button')
@lazy({ on: 'visible' })
class AppLikeButtonElement extends GemElement {}
```

| `on`            | 加载代码的时机               |
| --------------- | ---------------------------- |
| `'interaction'` | 第一次用户交互时，默认值。   |
| `'load'`        | 页面加载完成、浏览器空闲时。 |
| `'visible'`     | 元素进入视口时。             |

`on` 是 `'interaction'` 时，触发加载的事件会在原来的目标上重新派发
（`pointerdown`、`click`、`focusin`、`keydown` 或 `input`），第一次点击不会丢失。

适合点赞按钮、评论框等很少使用的部分，用来减小首屏的客户端包。

## `@client()`

用 `@client()` 标记的元素只在客户端渲染。服务端只输出标签（包括 attribute 和子内容），
客户端正常渲染，不水合。模块中可以使用只在浏览器运行的代码，包括顶层代码：

```ts
@customElement('app-editor')
@client()
class AppEditorElement extends GemElement {}
```

服务端构建时这个模块会被替换成空模块，所以其中不能有其他导出或者元素。

## 客户端导航时如何获取 HTML

首屏的服务端元素 HTML 已经在文档中。客户端导航创建页面时，Gemkit 按下面的顺序获取：
1. 前进后退时，使用当前历史记录的缓存
2. `<页面路径>/__elements.json`，预渲染时生成
3. 同一轮渲染中的元素合并成一个 `POST /__gemkit_element` 请求

按需渲染的请求在静态托管上不可用。如果包含服务端元素的页面没有预渲染，
客户端导航到它时需要服务器。

即使页面中没有服务端元素，也会请求 `__elements.json`，因为客户端要渲染后才知道有没有。
关闭预渲染时，客户端跳过这个请求，直接按需渲染。

## 预取

`<gem-link>` 悬停或者获得焦点时，Gemkit 预取目标页面的模块、布局、服务端数据（`__data.json`）
和服务端元素 HTML（`__elements.json`）。结果在 30 秒内使用一次。
前进后退时直接恢复历史记录的状态，不发送请求。

完整的流程见[渲染](./010-rendering.md)。

## 安全

服务端元素请求中的 URL、attribute 和 property 由客户端指定，任何元素都可以用任意 URL 请求。
`handle` 中的路径检查不能保护服务端元素，需要在元素内部检查权限：

```ts
@customElement('app-admin-stats')
@server()
class AppAdminStatsElement extends GemElement {
  @template()
  #content = () => (getRequestEvent().locals.user?.admin ? html`...` : html``);
}
```

## Store

渲染服务端元素时更新的模块级 store 会发送给客户端，水合时使用服务端的值。
store 的状态必须可以序列化成 JSON。
