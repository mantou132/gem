# Built-in elements

Gem provides some commonly used custom elements, they are not built-in by default, you need to manually introduce them yourself:

```js
import { html } from '@mantou/gem';
import '@mantou/gem/elements/link';

html`<gem-link path="/page"></gem-link>`;
```

| element                           | description                                                             |
| --------------------------------- | ----------------------------------------------------------------------- |
| `<gem-link>`/`<gem-active-link>`  | Similar to `<a>`                                                        |
| `<gem-route>`/`<gem-light-route>` | Provide routing matching, can be nested                                 |
| `<gem-title>`                     | Update `document.title` or display it where you need it                 |
| `<gem-use>`                       | SVG-like `<use>`                                                        |
| `<gem-unsafe>`                    | Render the string directly into content                                 |
| `<gem-reflect>`                   | Render the content to the specified element                             |
| `<gem-gesture>`                   | Support `pan`, `pinch`, `rotate`, `swipe`, `press`, `end` gesture event |

In addition, there are modules for developing element related to the _history stack_:

| Module              | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `createModalClass`  | A function that can generate a static class that can display UI |
| `DialogBaseElement` | A class based on which to create Dialog elements                |
