# Introduction

DuoyunUI is the UI library developed using [Gem](https://gemjs.org/), which has 70+ custom elements,
In addition to supporting common functions, you can easily complete internationalization, custom theme, keyboard access.
DuoyunUI aims to provide a UI library for lightweight, high performance, full feature, [cross-frame](https://custom-elents-everywhere.com/).

<gbp-media src="/preview.png"></gbp-media>

## Usage

### NPM

Install:

```sh
npm install duoyun-ui
```

Use DuoyunUI element:

```ts
import { render } from '@mantou/gem';

import 'duoyun-ui/elements/color-picker';

render(html`<dy-color-picker></dy-color-picker>`, document.body);
```

Use element API:

```ts
import { Toast } from 'duoyun-ui/elements/toast';

Toast.open('error', 'An error occurred');
```

### ESM

DuoyunUI supports an ESM method independently uses an element, such as adding a keyboard access to your website(press <kbd>f</kbd> list all focusable elements):

```ts
import('https://esm.sh/duoyun-ui/elements/keyboard-access').then(
  ({ DuoyunKeyboardAccessElement }) =>
    document.body.append(new DuoyunKeyboardAccessElement()),
);
```

For example, enable input recording mode:

```ts
import('https://esm.sh/duoyun-ui/elements/input-capture').then(
  ({ DuoyunInputCaptureElement }) =>
    document.body.append(new DuoyunInputCaptureElement()),
);
```

## Feedback DuoyunUI

Please visit [GitHub](https://github.com/mantou132/gem)
