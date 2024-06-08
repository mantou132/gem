# 拥抱 ES 装饰器

Gem 的 `v1.x.x` 版本支持 TypeScript 的实验性装饰器，装饰器为用户提供了非常友好的开发体验。
现在 ES 的[装饰器提案](https://github.com/tc39/proposal-decorators)已经进入 State 3 阶段，
各个浏览器供应商、构建工具都进行了各自的实现，从 `v2` 开始，Gem 将使用 ES 装饰器实现，
让你用 JavaScript 写的自定义元素也具备良好的类型支持。

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
> - `esbuild >= 0.21.2`, `target` 不要使用默认 `esnext`
> - `vite >= 5.3`
> - `typescript >= 5.0`
> - Chrome [bug track](https://issues.chromium.org/issues/42202709)
> - Firefox [bug track](https://bugzilla.mozilla.org/show_bug.cgi?id=1781212)

## 和 TS 装饰器的差异

TS 的字段装饰器在类定义之后立即执行，能很方便的在原型对象上定义访问器属性。
而 ES 的字段装饰器必须使用 `accessor` 才能达到类似的效果，就算使用 `accessor` 也将使 Gem 丧失部分功能。
所以 Gem 使用了特殊的方式来现实，使他看起来和 TS 装饰器没有任何区别,
实际上，这些装器返回的初始化函数将在每次实例化 `MyElement` 时运行，可以检查 `tsc` 编译后的代码：

```js
let MyElement = (() => {
  return class MyElement extends _classSuper {
    src = __runInitializers(this, _src_initializers, void 0);
  };
})();
```

## 使用 ES 装饰器的缺陷

`@attribute` 不再通过 `observedAttributes` 进行工作，而是拦截 `setAttribute`，在 DevTools 中修改时不使用修改后的 `setAttribute`，所以在 DevTools 中修改元素 Attribute 不能触发元素更新。
