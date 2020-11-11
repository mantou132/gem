# Re-Export

Gem’s dependency [`lit-html`](https://github.com/Polymer/lit-html), some APIs are re-exported by Gem:

| name        | description                                                    |
| ----------- | -------------------------------------------------------------- |
| `html`      | Template string tags, used to create HTML lit-html templates   |
| `svg`       | Template string tags, used to create SVG lit-html templates    |
| `render`    | Mount lit-html template to DOM                                 |
| `directive` | Custom lit-html template rendering directive                   |
| `repeat`    | Optimize lit-html list rendering directive                     |
| `guard`     | Directive to prevents re-render of a template                  |
| `ifDefined` | Directive to if the attribute is not set, delete the attribute |

Other APIs and commands can be imported from lit-html:

```js
import { parts } from 'lit-html';
```
