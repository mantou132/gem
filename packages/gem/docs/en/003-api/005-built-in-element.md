# Built-in elements

Gem provides some commonly used custom elements, they are not built-in by default, you need to manually introduce them yourself:

```js
import { html } from '@mantou/gem';
import '@mantou/gem/elements/link';

html`<gem-link path="/page"></gem-link>`;
```

## `<gem-link>`

Similar to `<a>`, support route.

<gbp-api name="gem-link" src="/src/elements/base/link.ts"></gbp-api>

## `<gem-active-link>`

<gbp-api name="gem-active-link" src="/src/elements/base/link.ts"></gbp-api>

## `<gem-route>`

Provide routing matching, can be nested.

<gbp-api name="gem-route" src="/src/elements/base/route.ts"></gbp-api>

<gbp-api src="/src/elements/base/route.ts"></gbp-api>

## `<gem-light-route>`

<gbp-api name="gem-light-route" src="/src/elements/base/route.ts"></gbp-api>

## `<gem-title>`

Update `document.title` or display it where you need it.

<gbp-api name="gem-title" src="/src/elements/base/title.ts"></gbp-api>

## `<gem-use>`

SVG-like `<use>`.

<gbp-api name="gem-use" src="/src/elements/base/use.ts"></gbp-api>

## `<gem-reflect>`

Render the content to the specified element.

<gbp-api name="gem-reflect" src="/src/elements/base/reflect.ts"></gbp-api>

## `<gem-gesture>`

Support `pan`, `pinch`, `rotate`, `swipe`, `press`, `end` gesture event.

<gbp-api name="gem-gesture" src="/src/elements/base/gesture.ts"></gbp-api>

## `<gem-unsafe>`

Render the string directly into content.

<gbp-api name="gem-unsafe" src="/src/elements/base/unsafe.ts"></gbp-api>

## Other

There are modules for developing element related to the _history stack_:

| Module              | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `createModalClass`  | A function that can generate a static class that can display UI |
| `DialogBaseElement` | A class based on which to create Dialog elements                |
