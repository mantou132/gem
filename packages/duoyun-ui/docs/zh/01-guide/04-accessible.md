# 可访问性支持

DuoyunUI 有部分可访问性支持：元素参考 [ARIA 1.3](https://w3c.github.io/aria/#role_definitions) 定义角色和状态，使用语义化标签，
另外，还具备键盘访问支持，你可以利用键盘 `Tab`, `Space`, `Esc` 键即可导航、操作。

> 快捷键支持
>
> DuoyunUI 自带一个简易的 [hotkeys](https://github.com/greena13/react-hotkeys) 以实现键盘访问，
> 你可以利用它来进行自定义快捷键绑定：
>
> ```ts
> import { hotkeys } from 'duoyun-ui/lib/hotkeys';
>
> const onOpenDocs = () => open(locahost.href);
> addEventListener('keypress', hotkeys({ 'ctrl+shift+k': onOpenDocs }));
> ```
>
> _如果在自定义元素中进行全局快捷键绑定，记得在元素卸载时解除绑定！_

> 全键盘支持
>
> DuoyunUI 包含一个 `<dy-keyboard-access>` 元素，它能让你的应用具备全键盘支持，类似（[Vimperator](http://vimperator.org/)），
> `h`, `j`, `k`, `l` 滚动页面，`f` 标记应用当前可见可聚焦元素，然后按下相应的键即可聚焦该元素并点击

## [`inert`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/inert) 特性

大部分模态弹出支持 `inert` 属性（应用在其他元素上），例如 `ContextMenu.open` 方法打开的上下文菜单，`inert` 能防止弹窗下面的内容被访问，
但是 `<dy-modal>` 并不总是具备该特性。

`<dy-modal>` 有两种使用方法：

1. 在渲染模版中直接写 `<dy-modal>`
2. 使用 `Modal.open` 的静态方法

第一种方法不支持 `inert` 特性，因为 `<dy-modal>` 在 DOM 中，并不方便对其他元素添加 `inert` 属性，
而第二种由于是创建 `<dy-modal>` 并挂载到 `<body>` 所以完全支持。

## 焦点环

一般情况下，使用键盘进行焦点导航时都应该显示焦点环，以便告诉用户当前焦点位置，
而在点击等指针事件聚焦时，没有必要显示焦点环，所以我们在网站中通常会使用下面的 CSS：

```css
:focus {
  outline: none;
}
:focus-visible {
  outline: 2px solid blue;
}
```

在 DuoyunUI 或者其他自定义元素，这段 CSS 不总是有用（不能穿透 ShadowDOM），所以 DuoyunUI 提供一段共享样式，你在需要焦点环时可以这样引用：

```ts
import { fcousStyle } from 'duoyun-ui/lib/styles';

@customElement('my-ele')
@adpotStyle(fcousStyle)
export class MyEleElement extends GemElement {}
```
