# Embrace ES Decorators

Gem's `v1.x.x` version supports TypeScript's experimental decorators, which provide a very user-friendly development experience.
Now [ES Decorator Proposal](https://github.com/tc39/proposal-decorators) has entered the State 3 stage.
Various browser vendors and build tools have implemented their own implementations. Starting from `v2`, Gem will be implemented using ES decorators.
Custom elements you write in JavaScript also have good type support.

```js 4,6,9,12
import { GemElement, customElement, html } from '@mantou/gem';
import { attribute, property, emitter } from '@mantou/gem';

@customElement('my-element')
class MyElement extends GemElement {
  @attribute
  src;

  @property
  callback = () => {};

  @emitter
  error;

  render = () => {
    return html`<div @click=${this.callback}>${this.src}</div>`;
  };
}
```

> [!NOTE]
>
> - `esbuild >= 0.21.2`, `target` don't use the default `esnext`
> - `vite >= 5.3`
> - `typescript >= 5.0`
> - Chrome [bug track](https://issues.chromium.org/issues/42202709)
> - Firefox [bug track](https://bugzilla.mozilla.org/show_bug.cgi?id=1781212)

## Differences from TypeScript Decorator

TypeScript's field decorator is executed immediately after the class definition, making it easy to define accessor properties on the prototype object.
The ES decorator must use `accessor` to achieve similar effects. Even using `accessor` will cause the Gem to lose some functions.
So Gem uses a special way to implement it so that it looks no different from the TypeScript decorator, in fact, the initialization functions returned by these loaders will be run every time `MyElement` is instantiated. You can check the `tsc` compiled code:

```js
let MyElement = (() => {
  return class MyElement extends _classSuper {
    src = __runInitializers(this, _src_initializers, void 0);
  };
})();
```

## Pitfalls of using ES Decorators

`@attribute` no longer work through the`observedAttributes`, but intercept the `setAttribute`. Do not use the modified` setAttribute` in DevTools, so modify the element attribute in DevTools cannot trigger the element update.

> [!NOTE]
> Installing the browser extension [Gem DevTools](https://chrome.google.com/webstore/detail/gem-devtools/lgfpciakeemopebkmjajengljoakjfle) will solve this problem
