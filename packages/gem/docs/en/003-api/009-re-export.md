# Re-Export

Gem’s dependency [`lit-html`](https://lit.dev/docs/templates/overview/), some APIs are re-exported by Gem:

| name        | description                                                    |
| ----------- | -------------------------------------------------------------- |
| `html`      | Template string tags, used to create HTML lit-html templates   |
| `svg`       | Template string tags, used to create SVG lit-html templates    |
| `render`    | Mount lit-html template to DOM                                 |
| `directive` | Custom lit-html template rendering directive                   |
| `repeat`    | Optimize lit-html list rendering directive                     |

Other directives can be imported from lit-html:

```js
import { cache } from 'lit-html/directives/cache';
```
