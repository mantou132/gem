# IDE support

Gem does not have perfect IDE support, but the following content can also give you a good development experience.

## VSCode

### Highlight

- Template highlight [vscode-lit-plugin](https://github.com/runem/lit-analyzer/tree/master/packages/vscode-lit-plugin)
- CSS rule highlighting [vscode-styled-component](https://github.com/styled-components/vscode-styled-components)

### Verification

When using defined elements in a template [vscode-lit-plugin](https://github.com/runem/lit-analyzer/tree/master/packages/vscode-lit-plugin) many verifications can be performed, including attr/prop type, custom element tag name, etc. To provide these features for elements, you need to manually [write](https://github.com/runem/lit-analyzer/tree/master/packages/vscode-lit-plugin#-documenting-slots-events-attributes-and-properties) jsDoc comment:

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

_In the future, the ts decorator may be used to let the IDE recognize all the characteristics of custom elements, in addition, the decorator is automatically transferred to jsDoc through a custom ts compiler, so that it can be used in js projects_
