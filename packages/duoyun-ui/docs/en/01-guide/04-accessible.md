# Accessible

DuoyunUI has accessibility support: reference [ARIA 1.3](https://w3c.github.io/aria/#role_definitions) defines roles and status, use a semantic tag,
in addition, there is also a keyboard access support, you can use the keyboard <kbd>Tab</kbd>, <kbd>Space</kbd>, <kbd>Esc</kbd> key to navigate, operate.

> [!Shortcut support]
> DuoyunUI has a built-in simple [hotkeys](https://github.com/greena13/react-hotkeys) to implement keyboard access,
> you can use it to make custom shortcut bindings:
>
> ```ts
> import { hotkeys } from 'duoyun-ui/lib/hotkeys';
>
> const onOpenDocs = () => open(locahost.href);
> addEventListener('keypress', hotkeys({ 'ctrl+shift+k': onOpenDocs }));
> ```
>
> _If the global shortcut binding is performed in a custom element, remember to unbinding when the element is unmount!_

> [!Vim mode support]
> DuoyunUI has a [`<dy-keyboard-access>`](../02-elements/keyboard-access.md) element, similar([Vimperator](http://vimperator.org/)),
> <kbd>h</kbd>, <kbd>j</kbd>, <kbd>k</kbd>, <kbd>l</kbd> scroll page,<kbd>f</kbd> list all focusable elements, then press the corresponding key to focus on this element and click

## [`inert`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/inert)

Most modal pop-up supports `inert` attributes(applied on other elements),
such as the context menu opened by `ContextMenu.open` method, `inert` prevent the content below the pop-up from being accessed,
but `<dy-modal>` does not always have this feature.

`<dy-modal>` has two ways to use:

1. Write directly in the rendering template to `<dy-modal>`
2. Use `Modal.open` static method

The first method does not support the `inert`, because `<dy-modal>` in DOM tree, it is not convenient to add a `inert` attribute to other elements,
the second is completely supported because it is created to create `<dy-modal>` and is mounted to `<body>`.

## Focus ring

In general, the focus ring should be displayed when using the keyboard to focus navigation to tell the user the current focus position,
when you click the pointer event, it is not necessary to display the focus ring, so we usually use the following CSS in the website:

```css
:focus {
  outline: none;
}
:focus-visible {
  outline: 2px solid blue;
}
```

In DuoyunUI or other custom elements, this CSS is not always useful(not support ShadowDOM), so DuoyunUI provides a shared style, you can reference the style when you need the focus ring:

```ts
import { focusStyle } from 'duoyun-ui/lib/styles';

@customElement('my-ele')
@adoptedStyle(focusStyle)
export class MyEleElement extends GemElement {}
```
