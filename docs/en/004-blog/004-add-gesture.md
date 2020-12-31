# Add gesture support to WebApp

When developing a mobile WebApp, gestures are a common way of interaction, but the web does not support gesture events, you may need to use a third-party library (for example: [Hammer.js](https://hammerjs.github.io/)) To support gesture operations, Gem built-in `<gem-gesture>` to complete simple gesture support.

## PointerEvent

A long time ago, the Web only supported [MouseEvent](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent). With the advent of the mobile era, the Web added [TouchEvent](https: //developer.mozilla.org/en-US/docs/Web/API/TouchEvent), now, in addition to the mouse and touch screen, there may be other pointing devices, such as a stylus. For this reason, the Web introduced [PointerEvent](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent), which provides a set of common events for various pointing devices. In order to facilitate migration, `PointerEvent` is similar to `MouseEvent` and provides events such as `pointerdown`, `pointerup`, `pointermove` and so on.

The following code adds a `pan` event to `<my-element>`:

```ts
@customElement('my-element')
class MyElement extends GemElement {
  @emitter pan: Emitter;
  start = false;
  constructor() {
    this.addEventListener('pointerdown', () => {
      this.start = true;
    });
    this.addEventListener('pointermove', ({ movementX, movementY }) => {
      this.pan({ x: movementX, y: movementY });
    });
    this.addEventListener('pointerup', () => {
      this.start = false;
    });
    this.addEventListener('pointercancel', () => {
      this.start = false;
    });
  }
}
```

## Pointer capture

When using `MouseEvent`, `TouchEvent`, when the pointer moves too fast, the pointer may leave the target element. Introducing `PointerEvent` and adding [Element.setPointerCapture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture), which can bind a series of pointer events to elements , No matter where the pointer is located, it improves gesture interaction on the Web.

```ts 8
@customElement('my-element')
class MyElement extends GemElement {
  @emitter pan: Emitter;
  start = false;
  constructor() {
    this.addEventListener('pointerdown', ({ pointerId }) => {
      this.start = true;
      this.setPointerCapture(pointerId);
    });
    this.addEventListener('pointermove', ({ movementX, movementY }) => {
      this.pan({ x: movementX, y: movementY });
    });
    this.addEventListener('pointerup', () => {
      this.start = false;
    });
    this.addEventListener('pointercancel', () => {
      this.start = false;
    });
  }
}
```

## `touch-action`

When performing gesture operations, the browser's native event handler may be triggered. For example, a drag event will be triggered when the mouse clicks on an image and tries to pan. This will trigger the `pointercancel` event and cause the pan gesture to be interrupted. [`touch-action`](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) provided by CSS solves this problem, `touch-action: none` will disable any touch action of the browser, so that the pan gesture can be performed normally.

```ts
html`<my-element @pan=${console.log} style="touch-action: none"></my-element>`;
```

## Use `<gem-gesture>`

`<gem-gesture>` supports simple gesture events: `pan`, `pinch`, `rotate`, `swipe`, `press`:

```ts
@customElement('my-app')
class MyApp extends GemElement {
  state = {
    x: 0,
    y: 0
  }

  onPan = ({x, y} => this.setState({x: this.state.x + x, y: this.state.y + y}))

  render() {
    return html`
      <style>
        gem-gesture {
          width: 100px;
          height: 100px;
          background: gray;

          translate: ${x}px ${y}px;
        }
      </style>
      <gem-gesture @pan=${this.onPan}></gem-gesture>
    `
  }
}
```
