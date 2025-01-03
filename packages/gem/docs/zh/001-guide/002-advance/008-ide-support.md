# IDE 支持

Gem 现在没有完美的 IDE 支持，但下面的内容也能让你获得不错的开发体验。

## VSCode

### 高亮

- [lit-plugin](https://marketplace.visualstudio.com/items?itemName=runem.lit-plugin)
- [Gem](https://marketplace.visualstudio.com/items?itemName=gem-vscode.vscode-plugin-gem)（[开发中](https://github.com/mantou132/gem/issues/144)，将来取代 lit-plugin）

### 验证

在模版中使用定义的元素时 [lit-plugin](https://github.com/runem/lit-analyzer/tree/master/packages/vscode-lit-plugin) 能进行许多验证，包括 attr/prop 类型，自定义元素标签名等。
要为元素提供这些功能，需要手动[编写](https://github.com/runem/lit-analyzer/tree/master/packages/vscode-lit-plugin#-documenting-slots-events-attributes-and-properties) jsDoc 注释：

```js
/**
 * This is my element
 * @custom-element my-element
 * @attr size
 * @attr {red|blue} color - The color of my element
 * @attr {boolean} disabled
 * @attr {number} count
 * @prop {String} value
 * @prop {Boolean} myProp - This is my property
 * @fires change
 * @fires my-event - This is my own event
 * @slot - This is a comment for the unnamed slot
 * @slot right - Right content
 * @slot left
 * @part header
 * @state hover
 */
class MyElement extends GemElement {}
```

_在未来可能通过 ts 装饰器让 IDE 识别自定义元素的所有特性，_
_另外通过自定义 ts 编译器将装饰器自动转移成 jsDoc，以便使用在 js 项目中_

## Zed

- Gem（[开发中](https://github.com/mantou132/gem/issues/144)，将来取代 lit-plugin）
