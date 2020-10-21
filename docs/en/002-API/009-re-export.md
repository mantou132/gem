# Re-Export

Gem’s dependency [`lit-html`](https://github.com/Polymer/lit-html), some APIs are re-exported by Gem:

| name        | description                                                   |
| ----------- | ------------------------------------------------------------- |
| `html`      | Template string tags, used to create HTML list-html templates |
| `svg`       | Template string tags, used to create SVG lit-html templates   |
| `render`    | Mount lit-html template to DOM                                |
| `repeat`    | Optimize lit-html list rendering instructions                 |
| `directive` | Custom lit-html template rendering instructions               |

Other APIs and commands can be imported from lit-html:

```js
import { parts } from 'lit-html';
```
