# 创建标准可靠的自定义元素

创建的自定义元素可以用在任何框架中，可以使用多种方法创建，当你要公开自己的自定义元素时，需要精心设计。

## 元素名称

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

## 可构造元素

在命令式调用中，在构造函数参数中配置属性是一种常见方式：

```ts
const img = new MyImgElement({ width: 100, height: 100 });
```

为了避免声明式中定义的静态 `attribute` 被构造函数中覆盖，在构造函数中应该*只设置传递的属性*：

```ts 9-10
@customElement('my-img')
class MyImgElement extends GemElement {
  @numattribute width: number;
  @numattribute height: number;
  @property srcObject?:  MediaStream | MediaSource | Blob | File;

  constructor(options = {}) {
    super();
    if (options.width) this.width = options.width;
    if (options.height) this.height = options.height;
    this.srcObject = options.srcObject;
  }
}
```

## Attribute 或 Property

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

当一个属性需要支持模版，则可以使用 `<slot>`（ShadowDOM） 或者非响应性 `Property`：


```ts
@shadow()
@customElement('portal-module-profile')
class PortalModuleProfileElement extends GemElement {
  @slot static name: string;
  @attribute name: string;

  get #name() {
    return html`<slot name=${PortalModuleProfileElement.name}>${this.name}</slot>`;
  }
}
```

```ts
@customElement('portal-module-profile')
class PortalModuleProfileElement extends GemElement {
  @attribute name: string;
  nameSlot?: TemplateResult;

  get #name() {
    return this.nameSlot || this.name;
  }
}
```

> [!TIP]
> 当弃用属性时可以用同样的方式确保向后兼容：
>
> ```ts
> @customElement('portal-module-profile')
> class PortalModuleProfileElement extends GemElement {
>   /**@deprecated */
>   @property data?: Item[];
>   @property items?: Item[];
>
>   get #items() {
>     return this.items || this.data;
>   }
> }
> ```

## Public 或 Private

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

## `addEventListener` 或 `onclick`

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
    super();
    this.addEventListener('click', console.log);
  }
}
```

## 处理元素错误

当元素内发生错误时，应该以事件当方式传播该错误，以便外部使用事件监听器处理错误：

```ts
@customElement('my-element')
class MyElement extends GemElement {
  @emitter error: Emitter<string>;

  async #fetchData = () => {
    try {
      //...
    } catch {
      this.error('fetch fail...');
    }
  }
}
```

## 性能

编写元素模板时，可以添加行内样式，这在 Shadow DOM 中能工作：

```ts
@customElement('my-element')
@shadow()
class MyElement extends GemElement {
  render = () => {
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
const styles = css`
  :host {
    display: contents;
  }
`;
@customElement('my-element')
@adoptedStyle(styles)
@shadow()
class MyElement extends GemElement {}
```

如果需要一次渲染许多实例，可以使用 `@async` 来创建异步渲染元素，它能避免渲染时阻塞主线程，保证 60fps：

```ts
@customElement('my-element')
@async()
class MyElement extends GemElement {}
```

## 样式

假设在其他地方使用上面定义的`<my-element>`元素，出于某种原因添加 `hidden` 属性希望暂时隐藏它：

```ts
html`<my-element hidden>My content</my-element>`;
```

会发现 `hidden` 属性没有生效，原因是自定义元素的样式 `display: contents` 将覆盖浏览器样式 `display: none`,
所以应该小心定义 `:host` 样式避免为外部使用时增加难度，例如使用 [`:where`](https://developer.mozilla.org/en-US/docs/Web/CSS/:where)：

```css
:host(:where(:not([hidden]))) {
  display: contents;
}
```

此外，使用 [`@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) 解决元素[多状态](https://developer.mozilla.org/en-US/docs/Web/API/CustomStateSet)样式覆盖的问题；使用 [CSS 嵌套](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting) 简化样式表。

## 可访问性

在用户使用自定义元素时，他们可以用 `role`,`aria-*` 属性指定元素的语义:

```ts
html`<my-element role="region" aria-label="my profile"></my-element>`;
```

使用 [`ElementInternals`](https://html.spec.whatwg.org/multipage/custom-elements.html#elementinternals) 可以定义自定义元素的默认语义，用 [`delegatesFocus`](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#delegatesfocus) 或者 `@aria.focusable` 处理聚焦：

```ts
@customElement('my-element')
@aria({ focusable: true, role: 'region', ariaLabel: 'my profile' })
class MyElement extends GemElement {
  @boolattribute disabled: boolean;

  render = () => {
    return html`<div>Focusable</div>`;
  }
}
```

> [!NOTE] `delegatesFocus` 或者 `@aria.focusable` 元素当有 `disabled` 属性时会像[原生元素](https://github.com/whatwg/html/issues/5886)一样不会触发 `click` 事件

资源：

- https://w3c.github.io/html-aria
- https://w3c.github.io/using-aria/
- https://www.w3.org/WAI/fundamentals/accessibility-principles/
