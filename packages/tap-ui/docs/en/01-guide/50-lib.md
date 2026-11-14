# Other modules

In addition to providing many custom elements, TapUI has some [base classes](./40-base-class.md) with certain features,
and also includes some common modules that are used in custom elements of TapUI, some of which are independent.

## Color

Color space conversion; brightness, contrast calculation.

<gbp-api src="/src/lib/color.ts"></gbp-api>

## Encode

hash, base64 etc encode/decode.

<gbp-api src="/src/lib/encode.ts"></gbp-api>

## HotKeys

Lightweight version of [hotkeys](https://github.com/greena13/react-hotkeys).

<gbp-api src="/src/lib/hotkeys.ts"></gbp-api>

## Image

Compressed image; generate SVG.

<gbp-api src="/src/lib/image.ts"></gbp-api>

## Number

Format numbers, range adjustments.

<gbp-api src="/src/lib/number.ts"></gbp-api>

## Time

Lightweight version of the date time process library.

<gbp-api src="/src/lib/time.ts"></gbp-api>

## Timer

Some timer functions.

<gbp-api src="/src/lib/timer.ts"></gbp-api>

## Utils

Some common functions.

<gbp-api src="/src/lib/utils.ts"></gbp-api>

## Other

- `animations`: Use [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) implement simple animation
- `cache`: Provide a simple [LRU](<https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)>) cache
- `icons`: Build-in icons, [see](./30-customize.md#customize-icon)
- `locale`: Switch, modify the language, [see](./30-customize.md#customize-text)
- `styles`: Some styles that can be shared globally
- `theme`: Build-in theme, [see](./30-customize.md#customize-theme)
- `types`: Convenient TypeScript type infer help function
