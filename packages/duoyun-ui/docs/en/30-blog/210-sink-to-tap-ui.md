# Sinking Foundations to TapUI

DuoyunUI targets desktop admin UIs, while [TapUI](https://github.com/mantou132/gem/tree/main/packages/tap-ui) is mobile-first. Both share the Gem stack, so reusable foundations move down into TapUI; DuoyunUI keeps desktop-specific UI on top.

## What Moved Down

Recent sinks include:

- **Utilities & theme**: `lib/*`, `locales/*`, parts of `helper/*` (earlier)
- **Base classes**: visible / resize bases (still re-exported under the old `Duoyun*` names)
- **List core**: infinite scroll and virtualization live in `<tap-list>`; `<dy-list>` extends it and keeps the default desktop item render (avatar, title, description)

Rough layering:

```text
TapUI          foundations, light interaction, reusable structure
  └─ DuoyunUI  desktop look, default rendering, admin components & patterns
```

Apps can keep importing from `duoyun-ui`; it depends on `tap-ui` underneath.

## Customizing UI: Class Tokens

After the sink, prefer composing styles over forking templates:

1. Expose **class tokens** with `css({})` in TapUI (or the base implementation)
2. In DuoyunUI (or your app), target the **same token** to layer styles

In TapUI, define tokens and apply them in the template:

```ts
import { css, html, GemElement } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { styled } from '@mantou/gem/lib/utils';

export const styles = css({
  div: styled`
    color: blue;
  `,
});

@customElement('tap-demo')
@adoptedStyle(styles)
export class TapDemoElement extends GemElement {
  render = () => html`<div class=${styles.div}>TapUI</div>`;
}
```

In DuoyunUI (or above), extend that token without changing structure:

```ts
import { css } from '@mantou/gem/lib/element';
import { adoptedStyle, customElement } from '@mantou/gem/lib/decorators';
import { styles, TapDemoElement } from 'tap-ui/elements/demo';

const dyStyles = css({
  [styles.div]: `
    font-weight: bold;
    font-size: 2em;
  `,
});

@customElement('dy-demo')
@adoptedStyle(dyStyles)
export class DuoyunDemoElement extends TapDemoElement {}
```

Notes:

- `styles.div` is both the **class name** in the template and the **selector key** in the override sheet
- The upper layer only adds diffs; structure and default behavior stay in TapUI
- DuoyunUI remains the place for theme colors, spacing, and desktop defaults like `renderItem`

That is also the intended direction for components such as `<dy-list>`: interaction in TapUI, look-and-feel in DuoyunUI, customized via class tokens (plus existing `::part` / theme variables).

## Summary

Sinking foundations into TapUI aims to:

- Share virtualization, visibility/resize observers, and other infra across mobile and desktop
- Keep DuoyunUI focused on desktop experience and defaults
- Customize with composable class tokens instead of forked implementations

New work should follow: TapUI provides structure and tokens → DuoyunUI customizes appearance.
