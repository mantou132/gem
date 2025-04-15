# `<dy-vestaboard>`

A character display component with animation effects, inspired by Vestaboard displays.

## Example

<gbp-example name="dy-vestaboard" src="https://esm.sh/duoyun-ui/elements/vestaboard">

```json
{
  "style": "font-size: 3em;font-weight: bold;",
  "char": "A",
  "variant": "polygon",
  "@click": "({target})=>target.char=String.fromCharCode(target.char.codePointAt(0)+1)"
}
```

</gbp-example>

## API

<gbp-api src="/src/elements/vestaboard.ts"></gbp-api>
