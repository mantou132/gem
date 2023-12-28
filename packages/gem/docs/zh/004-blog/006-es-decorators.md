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

## 和 TS 装饰器的差异

TS 的字段装饰器在类定义之后立即执行，能很方便的在原型对象上定义访问器属性。
而 ES 的装饰器必须使用 `accessor` 才能达到类似的效果，就算使用 `accessor` 也将使 Gem 丧失部分功能。
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

- 对于反应性的 Attribute 在 DevTools 中修改时不能触发元素更新，因为原生的 `observedAttributes` 不能为动态添加的属性生效
- 在执行 `@attribute` 的初始化函数时，需要进行一下 hack 工作，性能将会小幅度降低
- 元素必须插入文档才能正确读取属性——只有插入文档才有[机会](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields#description)删除元素上的字段
  > [!CAUTION]
  >
  > ```js
  > const myEle = new MyElement();
  > console.assert(myEle.src, undefined);
  > myEle.connectedCallback();
  > console.assert(myEle.src, '');
  > ```
