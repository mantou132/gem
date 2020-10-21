# Stylized elements

Because of the use of ShadowDOM, there is no longer a need for [CSS Modules](https://css-tricks.com/css-modules-part-3-react/) similar solutions, in addition, browser compatibility has improved in recent years, and vendor private prefixes have also been cancelled. We can use native CSS features to complete daily work.

_[Nesting CSS](https://drafts.csswg.org/css-nesting-1/) is still a feature worth looking forward to. _

## Shared style

Since styles cannot penetrate ShadowDOM, global style sheets cannot be used to implement shared styles. But you can use [`<link>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link) and [CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) to achieve the same effect, it’s more convenient to use [Constructable Stylesheet](https://wicg.github.io/construct-stylesheets/), but currently Safari does not support it.

```js
import { GemElement } from '@mantou/gem';
import { createCSSSheet, css } from '@mantou/gem';

// Create a style sheet using Constructable Stylesheet
const styles = createCSSSheet(css`
  h1 {
    text-decoration: underline;
  }
`);
class HelloWorld extends GemElement {
  static adoptedStyleSheets = [styles];
}
```

Just like connecting to the Store, there is a similar Typescript decorator available: `@adoptedStyle`.

```ts
import { GemElement } from '@mantou/gem';
import { adoptedStyle } from '@mantou/gem';

// Omit the styles definition...

@adoptedStyle(styles)
class HelloWorld extends GemElement {}
```

## CSS in JS

You can reference CSS selectors in JS:

```js
import { GemElement, html } from '@mantou/gem';
import { createCSSSheet, styled } from '@mantou/gem';

const styles = createCSSSheet({
  // This is temporarily designed as `styled.class` in order to be compatible with the syntax highlighting of `styled-component`
  h1: styled.class`
    text-decoration: underline;
    &:hover {
      text-decoration: none;
    }
  `,
});

class HelloWorld extends GemElement {
  static adoptedStyleSheets = [styles];
  render() {
    return html`
      <div class=${styles.h1}></div>
    `;
  }
}
```

## Customize the style outside the element

Use [`::part`](https://drafts.csswg.org/css-shadow-parts-1/#part) to export the internal content of the element, allowing external custom styles:

```ts
/**
 * The following code has the same effect as `<div part="header"></div>`,
 * But Gem recommends using decorators to define parts,
 * so that IDE integration can be done well in the future
 */

// Omit import...

class HelloWorld extends GemElement {
  @part header: string;

  render() {
    return html`
      <div part=${this.header}></div>
    `;
  }
}
```

Also use [`:state`](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/custom-states-and-state-pseudo-class.md) to export the internal state of the element for current state of external styling:

```ts
// Omit import...

class HelloWorld extends GemElement {
  @state opened: boolean;

  open() {
    // Can be selected by the selector `:state(opened)`
    this.opened = true;
  }
}
```

_Note the difference with `state`/`setState`._

## Custom element external style

- [`::slotted()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::slotted)
