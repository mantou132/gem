# Stylized elements

Because of the use of ShadowDOM, there is no longer a need for [CSS Modules](https://css-tricks.com/css-modules-part-3-react/) similar solutions, in addition, browser compatibility has improved in recent years, and vendor private prefixes have also been cancelled. Can use native CSS features to complete daily work, e.g: [CSS Nesting](https://drafts.csswg.org/css-nesting-1/), [`@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer).

## Shared style

Since styles cannot penetrate ShadowDOM, global style sheets cannot be used to implement shared styles. But you can use [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) and [CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) to achieve the same effect, it’s more convenient to use [Constructable Stylesheet](https://wicg.github.io/construct-stylesheets/).

```js 11
import { GemElement } from '@mantou/gem';
import { createCSSSheet, css } from '@mantou/gem';

// Create a style sheet using Constructable Stylesheet
const styles = createCSSSheet(css`
  h1 {
    text-decoration: underline;
  }
`);
class MyElement extends GemElement {
  static adoptedStyleSheets = [styles];
}
customElements.define('my-element', MyElement);
```

Just like connecting to the Store, there is a similar Typescript decorator available: `@adoptedStyle`.

```ts 6
import { GemElement } from '@mantou/gem';
import { adoptedStyle, customElement } from '@mantou/gem';

// Omit the styles definition...

@adoptedStyle(styles)
@customElement('my-element')
class MyElement extends GemElement {}
```

## CSS in JS

You can reference CSS selectors in JS:

```ts 18
import { GemElement, html } from '@mantou/gem';
import { createCSSSheet, styled, adoptedStyle, customElement } from '@mantou/gem';

const styles = createCSSSheet({
  // This is temporarily designed as `styled.class` in order to be compatible with the syntax highlighting of `styled-component`
  header: styled.class`
    text-decoration: underline;
    &:hover {
      text-decoration: none;
    }
  `,
});

@adoptedStyle(styles)
@customElement('my-element')
class MyElement extends GemElement {
  render() {
    return html`<div class=${styles.header}></div>`;
  }
}
```

## Customize the style outside the element

Use [`::part`](https://drafts.csswg.org/css-shadow-parts-1/#part) to export the internal content of the element, allowing external custom styles:

```ts 13
/**
 * The following code has the same effect as `<div part="header"></div>`,
 * But Gem recommends using decorators to define parts, so that IDE integration can be done well in the future
 */

// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @part header: string;

  render() {
    return html`<div part=${this.header}></div>`;
  }
}
```

Also use [`ElementInternals.states`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/states) to export element internal state, external styling this element for current state:

```ts
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @state opened: boolean;

  open() {
    // Can be selected by the selector `:state(opened)`
    // Consider compatibility can be used `:where(:state(opened), [data-opened])`
    this.opened = true;
  }
}
```

_Note the difference with `state`/`setState`._

> [!TIP]
> Can also customize element styles using hack, for example:
>
> ```js
> GemLinkElement.adoptedStyleSheets = [
>   createCSSSheet(css`
>     :host {
>       font-style: italic;
>     }
>   `),
> ];
> ```

## Custom element external style

- [`::slotted()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::slotted)
