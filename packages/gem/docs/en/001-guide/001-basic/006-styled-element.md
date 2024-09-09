# Stylized elements

Benefit from ShadowDOM, [CSS Nesting](https://drafts.csswg.org/css-nesting-1/), [`@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer), [`@scope`](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope), in addition, browser compatibility has improved in recent years, and vendor private prefixes have also been cancelled, there is no longer a need for [CSS Modules](https://css-tricks.com/css-modules-part-3-react/) similar solutions.

## Shared style

Use the `createcssSheet` to create a shared style table, use `@adoptedStyle` to apply to the required elements.

```js 11
import { GemElement } from '@mantou/gem';
import { adoptedStyle, customElement } from '@mantou/gem';

// 使用 Constructable Stylesheet 创建样式表
const styles = createCSSSheet(`
  h1 {
    text-decoration: underline;
  }
`);

@adoptedStyle(styles)
@customElement('my-element')
class MyElement extends GemElement {}
```

Because the style cannot penetrate the ShadowDOM, the global style table cannot be used to achieve sharing styles.
But you can use [CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*) to achieve the same effect.

## CSS in JS

You can reference CSS selectors in JS:

```js 17
import { GemElement, html } from '@mantou/gem';
import { createCSSSheet, styled, adoptedStyle, customElement } from '@mantou/gem';

const styles = createCSSSheet({
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

> [!NOTE]
> Use `$` as a key to represent `:host, :scope` selectors, allowing styles to apply to both ShadowDOM and LightDOM.

## Stylized Instance

If you need to specify the style of a single instance through properties or states, you can:

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @attribute color;

  render() {
    return html`
      <style>
        :host {
          --color: ${this.color}
        }
      </style>
    `;
  }
}
```

This method is complex and troublesome to write; it is recommended to use [`useDecoratorTheme`](../002-advance/003-theme.md#element-level-theme).

## Customize the style outside the element

Use [`::part`](https://drafts.csswg.org/css-shadow-parts-1/#part)(only ShadowDOM) to export the internal content of the element, allowing external custom styles:

```js 13
/**
 * The following code has the same effect as `<div part="header"></div>`,
 * But Gem recommends using decorators to define parts, so that IDE integration can be done well in the future
 */

// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @part static header;

  render() {
    return html`<div part=${MyElement.header}></div>`;
  }
}
```

Also use [`ElementInternals.states`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/states) to export element internal state, external styling this element for current state:

```js
// Omit import...

@customElement('my-element')
class MyElement extends GemElement {
  @state opened;

  open() {
    // Can be selected by the selector `:state(opened)`
    this.opened = true;
  }
}
```

> [!NOTE]
> Note the difference with `createState`

> [!TIP]
> Can also customize element styles using hack, for example:
>
> ```js
> GemLinkElement.adoptedStyleSheets.push(
>   createCSSSheet(css`
>     * {
>       font-style: italic;
>     }
>   `),
> );
> ```

## Custom element external style

- [`::slotted()`](https://developer.mozilla.org/en-US/docs/Web/CSS/::slotted)
