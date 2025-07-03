# Gem SSR

Server render Gem element

## Basic usage

```js
// Import before any Gem element
import { renderToString } from 'gem-ssr';

app.get('/', async (req, res) => {
  const content = await renderToString(html`<app-root></app-root>`));
  res.send(templateContent.replace(`<app-root></app-root>`, content);
});
```

## Improve WebApp Performance

### Lazy View

The server renders the initial data, load the element when user interacting, and then playback of the interaction event

```ts
@lazy()
@customElement('gem-ssr')
class GemSsrElement extends GemElement {
  #state = createState({ content: 0 });

  @server() // or `@server('lazy')`
  @mounted()
  #init = async () => {
    this.#state({ content: await 1; });
  }
}
```

The method marked with `@server()` waits for execution to complete on the server before returning, while `@server('lazy')` returns first, then executes, and re-renders the content after execution.

### Server Side Element

A lazy special case that never loads element

```ts
@lazy('never')
@customElement('gem-ssr')
class GemSsrElement extends GemElement {}
```
