# 创建标准可靠的自定义元素

> 推荐使用 TypeScript 来编写，本文的示例也使用 TypeScript

创建的自定义元素可以用在任何框架中，可以使用多种方法创建，当你要公开自己的自定义元素时，需要精心设计。

### 元素名称

创建自定义元素首先要考虑的是定义一个合适的元素名称，因为整个文档中不允许有重复的元素名称。所以你应该在你的项目中定义一种明确的命名方式：

```html
<!-- 库-组件 -->
<gem-link></gem-link>
<gem-route></gem-route>

<!-- 应用-类型-组件 -->
<portal-page-user></portal-page-user>
<portal-module-profile></portal-module-profile>
<portal-ui-checkbox></portal-ui-checkbox>
```

他们的类名应该对应元素名称，因为直接使用构造函数也是创建元素的一种方式：

```ts
new GemLinkElement();
new PortalPageUserElement();
new PortalModuleProfileElement();
```

### Attribute or Property

使用 Gem 创建自定义元素时，可以定义 Attribute 和 Property，他们都能传递数据给元素，并且都能让他们具备“观察性”，即改变他们的值时会触发元素更新。但是 Attribute 是可以用 Markup 表示的，机器可读，在浏览器 DevTools 也可以直接编辑，并且 Attribute 都有默认值，在元素内部使用时非常方便，所以如果能用 Attribute 表示的数据时尽量使用 Attribute，Attribute 不支持的数据类型才使用 Property。

```ts
@customElement('portal-module-profile')
class PortalModuleProfileElement extends GemElement {
  @attribute name: string;
  @numattribute age: number;
  @boolattribute vip: boolean;

  @property data?: Data;
}
```

### Public or Private

使用 TypeScript 编写 Gem 元素时，其字段和方法默认都是 `public` 的，你固然可以使用 `private` 修饰符来标记为私有，但是在 JavaScript 中看来他们还是公开的，可以在元素外部访问，为了防止用户意外使用这些字段和方法，应该使用 JavaScript 中的[私有字段](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields)：

```ts
@customElement('my-element')
class MyElement extends GemElement {
  #valid = false;
  #process = () => {
    //
  };
}
```

使用私有字段的另一个好处是不会和 `GemElement`/`HTMLelement` 属性或者方法重名，这对开发复杂元素时有很高的收益。

### `addEventListener` or `onclick`

在元素内部添加原生 DOM 事件监听器时可以使用事件处理器属性：

```ts
@customElement('my-element')
class MyElement extends GemElement {
  onclick = console.log;
}
```

千万不要使用这种方式，因为他们有很多缺点：

- 根据[ES 语义](https://github.com/tc39/proposal-class-fields#public-fields-created-with-objectdefineproperty)，它将不能工作
- 能在元素外部覆盖和取消

所以你应该使用 `addEventListener` 来注册事件处理器：

```ts
@customElement('my-element')
class MyElement extends GemElement {
  constructor() {
    this.addEventListener('click', console.log);
  }
}
```

### 处理元素错误

当元素内发生错误时，应该以事件当方式传播该错误，以便外部使用事件监听器处理错误：

```ts
@customElement('my-element')
class MyElement extends GemElement {
  @emitter error: Emitter<string>;

  async #fetchData() {
    try {
      //...
    } catch {
      this.error('fetch fail...');
    }
  }
}
```

### 性能

使用 Gem 编写自定义元素时默认使用 ShadowDOM，它有隔离 CSS 的优异特性

```ts
@customElement('my-element')
class MyElement extends GemElement {
  render() {
    return html`
      <style>
        :host {
          display: contents;
        }
      </style>
    `;
  }
}
```

这相当于在每个 `<my-element>` 中创建 `<style>` 元素，如果是静态样式，应该尽量使用 [Constructable Stylesheet](https://wicg.github.io/construct-stylesheets/)，它的性能更好，内存占用更低：

```ts
const style = createCSSSheet(css`
  :host {
    display: contents;
  }
`);
@customElement('my-element')
@adoptedStyle(style)
class MyElement extends GemElement {}
```

如果需要一次渲染许多实例，可以使用 `isAsync` 来创建异步渲染元素，它能避免渲染时阻塞主线程，保证 60fps：

```ts
@customElement('my-element')
class MyElement extends GemElement {
  constructor() {
    super({ isAsync: ture });
  }
}
```
