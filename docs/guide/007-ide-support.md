# IDE 支持

## VSCode

### 高亮

- 模版高亮 [vscode-lit-plugin](https://github.com/runem/lit-analyzer/tree/master/packages/vscode-lit-plugin)
- css 规则高亮 [vscode-styled-component](https://github.com/styled-components/vscode-styled-components)

### 验证

在模版中使用定义的元素时 vscode-lit-plugin 能进行许多验证，包括 attr/prop 类型，自定义元素标签名等。
要为元素提供这些功能，需要手动[编写](https://github.com/runem/lit-analyzer/tree/master/packages/vscode-lit-plugin#-documenting-slots-events-attributes-and-properties) jsdoc 注释：

```js
/**
 * This is my element
 * @custom-element my-element
 * @attr size
 * @attr {red|blue} color - The color of my element
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
