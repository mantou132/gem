# `<dy-drawer>`

A drawer is a panel that slides in from the edge of the screen. It can contain various types of content and is commonly used for navigation menus, filters, or additional information panels.

## Example

<gbp-example
  name="dy-drawer"
  props='{"header": "Title", "open": true, "@ok": "(evt) => evt.target.open = false", "@close": "(evt) => evt.target.open = false", "@maskclick": "(evt) => evt.target.open = false"}'
  html='Drawer'
  src="https://esm.sh/duoyun-ui/elements/drawer">Current page auto open drawer, <a href="./drawer">refresh</a></gbp-example>

## API

See [`<dy-modal>`](./modal.md)

<gbp-api src="/src/elements/drawer.ts"></gbp-api>
