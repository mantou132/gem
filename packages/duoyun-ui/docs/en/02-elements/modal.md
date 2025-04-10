# `<dy-modal>`

A modal dialog component that creates an overlay to focus user attention on specific content or actions. It supports customizable headers, content, and actions, with built-in support for closing via mask click or buttons.

## Example

<gbp-example
  name="dy-modal"
  props='{"header": "Title", "open": true, "@ok": "(evt) => evt.target.open = false", "@close": "(evt) => evt.target.open = false", "@maskclick": "(evt) => evt.target.open = false"}'
  html='Modal'
  src="https://esm.sh/duoyun-ui/elements/modal">Current page auto open modal, <a href="./modal">refresh</a></gbp-example>

## API

<gbp-api src="/src/elements/modal.ts"></gbp-api>
