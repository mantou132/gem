# Introduction

TapUI is a mobile-first UI library developed using [Gem](https://gemjs.org/).
It provides touch-friendly elements, stack navigation, sheets and automatic safe area handling,
and it is also the foundation of the desktop UI library [DuoyunUI](https://duoyun-ui.gemjs.org/en/).

## Usage

### NPM

Install:

```sh
npm install @mantou/tap-ui
```

Use TapUI element:

```ts
import { html, render } from '@mantou/gem';

import '@mantou/tap-ui/elements/button';

render(html`<tap-button>Button</tap-button>`, document.body);
```

Use element API:

```ts
import { Toast } from '@mantou/tap-ui/elements/toast';

Toast.open('error', 'An error occurred');
```

### ESM

Each element can be used independently from a CDN:

```ts
import('https://esm.sh/@mantou/tap-ui/elements/rolling-number');
```

## Feedback TapUI

Please visit [GitHub](https://github.com/mantou132/gem)
