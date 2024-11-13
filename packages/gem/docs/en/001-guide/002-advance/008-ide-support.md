# IDE support

Gem does not have perfect IDE support, but the following content can also give you a good development experience.

## VSCode

### Highlight

- [lit-plugin](https://marketplace.visualstudio.com/items?itemName=runem.lit-plugin)
- [Gem](https://marketplace.visualstudio.com/items?itemName=gem-vscode.vscode-plugin-gem) ([Under development](https://github.com/mantou132/gem/issues/144), will replace lit-plugin in the future)

### Verification

When using defined elements in a template [lit-plugin](https://github.com/runem/lit-analyzer/tree/master/packages/vscode-lit-plugin) many verifications can be performed, including attr/prop type, custom element tag name, etc. To provide these features for elements, you need to manually [write](https://github.com/runem/lit-analyzer/tree/master/packages/vscode-lit-plugin#-documenting-slots-events-attributes-and-properties) jsDoc comment:

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


## Zed

- Gem ([Under development](https://github.com/mantou132/gem/issues/144), will replace lit-plugin in the future)