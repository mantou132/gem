# 为 WebApp 添加手势支持

在开发移动 WebApp 时，手势是常用的交互方式，但是 Web 中并未支持支持手势事件，你可能需要使用第三方库(例如：[Hammer.js](https://hammerjs.github.io/))来支持手势操作，Gem 内置 `<gem-gesture>` 来完成简单的手势支持。

## `PointerEvent`

很久以前，Web 只支持 [MouseEvent](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent)，随着移动时代的带来，Web 添加了 [TouchEvent](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent)，现在，除了鼠标以及触摸屏外，可能还有其他的指针设备，比如手写笔。为此，Web 引入了 [PointerEvent](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent)，它为各种指针设备提供了一组通用事件，为了方便迁移，`PointerEvent` 类似 `MouseEvent` 提供了 `pointerdown`, `pointerup`, `pointermove` 等事件。

下面的代码为 `<my-element>` 添加了 `pan` 事件：

```ts
@customElement('my-element')
class MyElement extends GemElement {
  @emitter pan: Emitter;
  #start = false;
  constructor() {
    this.addEventListener('pointerdown', () => {
      this.#start = true;
    });
    this.addEventListener('pointermove', ({ movementX, movementY }) => {
      this.pan({ x: movementX, y: movementY });
    });
    this.addEventListener('pointerup', () => {
      this.#start = false;
    });
    this.addEventListener('pointercancel', () => {
      this.#start = false;
    });
  }
}
```

## 指针捕获

在使用 `MouseEvent`, `TouchEvent` 时，当指针移动过快时，指针可能会离开目标元素。引入 `PointerEvent` 的同时添加了 [Element.setPointerCapture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)，它能将一系列指针事件绑定到元素，无论指针位于什么位置，它改善了 Web 的手势交互。

```ts 8
@customElement('my-element')
class MyElement extends GemElement {
  @emitter pan: Emitter;
  #start = false;
  constructor() {
    this.addEventListener('pointerdown', ({ pointerId }) => {
      this.#start = true;
      this.setPointerCapture(pointerId);
    });
    this.addEventListener('pointermove', ({ movementX, movementY }) => {
      this.pan({ x: movementX, y: movementY });
    });
    this.addEventListener('pointerup', () => {
      this.#start = false;
    });
    this.addEventListener('pointercancel', () => {
      this.#start = false;
    });
  }
}
```

## `touch-action`

在进行手势操作时，可能触发浏览器原生的事件处理器，比如，鼠标点击图片试图平移时会触发拖拽事件，这是会触发 `pointercancel` 事件导致平移手势中断。CSS 提供的 [`touch-action`](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) 解决了这个问题，`touch-action: none` 将禁用浏览器的任何触摸动作，以便正常进行平移手势。

```ts
html`<my-element @pan=${console.log} style="touch-action: none"></my-element>`;
```

## 使用 `<gem-gesture>`

`<gem-gesture>` 支持简单的手势事件：`pan`, `pinch`, `rotate`, `swipe`, `press`：

```ts
@customElement('my-app')
class MyApp extends GemElement {
  #state = createState({
    x: 0,
    y: 0
  })

  #onPan = ({x, y} => this.#state({x: this.#state.x + x, y: this.#state.y + y}))

  render = () => {
    return html`
      <style>
        gem-gesture {
          width: 100px;
          height: 100px;
          background: gray;

          translate: ${x}px ${y}px;
        }
      </style>
      <gem-gesture @pan=${this.#onPan}></gem-gesture>
    `
  }
}
```
