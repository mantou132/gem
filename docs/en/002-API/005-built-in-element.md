# Built-in elements

Gem provides some commonly used custom elements, they are not built-in by default, you need to manually introduce them yourself:

```js
import { html } from 'https://dev.jspm.io/@mantou/gem';
import 'https://dev.jspm.io/@mantou/gem/elements/link';

html`<gem-link path="/page"></gem-link>`;
```

| element         | description                                             |
| --------------- | ------------------------------------------------------- |
| `<gem-link>`    | Similar to `<a>`                                        |
| `<gem-route>`   | Provide routing matching, can be nested                 |
| `<gem-title>`   | Update `document.title` or display it where you need it |
| `<gem-use>`     | SVG-like `<use>`                                        |
| `<gem-unsafe>`  | Render the string directly into content                 |
| `<gem-reflect>` | Render the content to the specified element             |

_When it comes to history stack_, two basic functions are provided:

| module      | description                                                           |
| ----------- | --------------------------------------------------------------------- |
| modal-base  | Export a function, he can generate a static class that can display UI |
| dialog-base | Export a class and create a Dialog element based on it                |
