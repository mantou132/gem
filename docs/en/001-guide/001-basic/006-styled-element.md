# Stylized elements

Because of the use of ShadowDOM, there is no longer a need for [CSS Modules](https://css-tricks.com/css-modules-part-3-react/) similar solutions, in addition, browser compatibility has improved in recent years, and vendor private prefixes have also been cancelled. Can use native CSS features to complete daily work.

_[Nesting CSS](https://drafts.csswg.org/css-nesting-1/) is still a feature worth looking forward to._

## Shared style

Since styles cannot penetrate ShadowDOM, global style sheets cannot be used to implement shared styles. But you can use [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) and [CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) to achieve the same effect, it’s more convenient to use [Constructable Stylesheet](https://wicg.github.io/construct-stylesheets/), but currently Safari does not support it.

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

```js 17
import { GemElement, html } from '@mantou/gem';
import { createCSSSheet, styled } from '@mantou/gem';

const styles = createCSSSheet({
  // This is temporarily designed as `styled.class` in order to be compatible with the syntax highlighting of `styled-component`
  header: styled.class`
    text-decoration: underline;
    &:hover {
      text-decoration: none;
    }
  `,
});

class MyElement extends GemElement {
  static adoptedStyleSheets = [styles];
  render() {
    return html`<div class=${styles.header}></div>`;
  }
}
customElements.define('my-element', MyElement);
```

## Customize the style outside the element

Use [`::part`](https://drafts.csswg.org/css-shadow-parts-1/#part) to export the internal content of the element, allowing external custom styles:

```ts 13
/**
 * The following code has the same effect as `<div part="header"></div>`,
 * But Gem recommends using decorators to define parts,
 * so that IDE integration can be done well in the future
 */

// Omit import...

class MyElement extends GemElement {
  @part header: string;

  render() {
    return html`<div part=${this.header}></div>`;
  }
}
customElements.define('my-element', MyElement);
```

Also use [`:--xxx`](https://wicg.github.io/custom-state-pseudo-class/) to export the internal state of the element for current state of external styling:

```ts
// Omit import...

class MyElement extends GemElement {
  @state opened: boolean;

  open() {
    // Can be selected by the selector `:--opened`
    // Consider compatibility can be used `:where(:--opened, .--opened)`
    this.opened = true;
  }
}
customElements.define('my-element', MyElement);
```

_Note the difference with `state`/`setState`._

## Custom element external style

- [`::slotted()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::slotted)
