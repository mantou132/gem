# Introduction

DuoyunUI is the UI library developed using [Gem](https://gemjs.org/), which has 70+ custom elements,
In addition to supporting common functions, you can easily complete internationalization, custom theme, keyboard access.
DuoyunUI aims to provide a UI library for lightweight, high performance, full feature, [cross-frame](https://custom-elents-everywhere.com/).

<gbp-media src="/preview.png"></gbp-media>

## Elements Overview

### Form

> [`<dy-cascader-picker>`](../02-elements/cascader-picker.md),
> [`<dy-cascader>`](../02-elements/cascader.md),
> [`<dy-checkbox>`](../02-elements/checkbox.md),
> [`<dy-color-panel>`](../02-elements/color-panel.md),
> [`<dy-color-picker>`](../02-elements/color-picker.md),
> [`<dy-date-panel>`](../02-elements/date-panel.md),
> [`<dy-date-picker>`](../02-elements/date-picker.md),
> [`<dy-date-range-panel>`](../02-elements/date-range-panel.md),
> [`<dy-date-range-picker>`](../02-elements/date-range-picker.md),
> [`<dy-drop-area>`](../02-elements/drop-area.md),
> [`<dy-file-picker>`](../02-elements/file-picker.md),
> [`<dy-form>`](../02-elements/form.md),
> [`<dy-input>`](../02-elements/input.md),
> [`<dy-picker>`](../02-elements/picker.md),
> [`<dy-radio>`](../02-elements/radio.md),
> [`<dy-rate>`](../02-elements/rate.md),
> [`<dy-select>`](../02-elements/select.md),
> [`<dy-segmented>`](../02-elements/segmented.md),
> [`<dy-shortcut-record>`](../02-elements/shortcut-record.md),
> [`<dy-slider>`](../02-elements/slider.md),
> [`<dy-switch>`](../02-elements/switch.md),
> [`<dy-time-panel>`](../02-elements/time-panel.md),
> [`<dy-time-picker>`](../02-elements/time-picker.md)

### Action

> [`<dy-action-text>`](../02-elements/action-text.md),
> [`<dy-button>`](../02-elements/button.md),
> [`<dy-copy>`](../02-elements/copy.md),
> [`<dy-link>`](../02-elements/link.md),
> [`<dy-contextmenu>`](../02-elements/contextmenu.md),
> [`<dy-options>`](../02-elements/options.md)

### Feedback

> [`<dy-badge>`](../02-elements/badge.md),
> [`<dy-coach-mark>`](../02-elements/coach-mark.md),
> [`<dy-drawer>`](../02-elements/drawer.md),
> [`<dy-help-text>`](../02-elements/help-text.md),
> [`<dy-input-capture>`](../02-elements/input-capture.md),
> [`<dy-keyboard-access>`](../02-elements/keyboard-access.md),
> [`<dy-loading>`](../02-elements/loading.md),
> [`<dy-meter>`](../02-elements/meter.md),
> [`<dy-modal>`](../02-elements/modal.md),
> [`<dy-page-loadbar>`](../02-elements/page-loadbar.md),
> [`<dy-placeholder>`](../02-elements/placeholder.md),
> [`<dy-popover>`](../02-elements/popover.md),
> [`<dy-progress>`](../02-elements/progress.md),
> [`<dy-status-light>`](../02-elements/status-light.md),
> [`<dy-toast>`](../02-elements/toast.md),
> [`<dy-tooltip>`](../02-elements/tooltip.md),
> [`<dy-wait>`](../02-elements/wait.md)

### Navigator

> [`<dy-breadcrumbs>`](../02-elements/breadcrumbs.md),
> [`<dy-pagination>`](../02-elements/pagination.md),
> [`<dy-side-navigation>`](../02-elements/side-navigation.md)

### Data Entry

> [`<dy-alert>`](../02-elements/alert.md),
> [`<dy-avatar>`](../02-elements/avatar.md),
> [`<dy-banner>`](../02-elements/banner.md),
> [`<dy-calendar>`](../02-elements/calendar.md),
> [`<dy-card>`](../02-elements/card.md),
> [`<dy-code-block>`](../02-elements/code-block.md),
> [`<dy-collapse>`](../02-elements/collapse.md),
> [`<dy-compartment>`](../02-elements/compartment.md),
> [`<dy-divider>`](../02-elements/divider.md),
> [`<dy-empty>`](../02-elements/empty.md),
> [`<dy-heading>`](../02-elements/heading.md),
> [`<dy-image-preview>`](../02-elements/image-preview.md),
> [`<dy-list>`](../02-elements/list.md),
> [`<dy-more>`](../02-elements/more.md),
> [`<dy-paragraph>`](../02-elements/paragraph.md),
> [`<dy-result>`](../02-elements/result.md),
> [`<dy-space>`](../02-elements/space.md),
> [`<dy-statistic>`](../02-elements/statistic.md),
> [`<dy-table>`](../02-elements/table.md),
> [`<dy-tabs>`](../02-elements/tabs.md),
> [`<dy-tag>`](../02-elements/tag.md),
> [`<dy-text-mask>`](../02-elements/text-mask.md),
> [`<dy-timeline>`](../02-elements/timeline.md),
> [`<dy-tree>`](../02-elements/tree.md)

### Chart

> [`<dy-area-chart>`](../02-elements/area-chart.md),
> [`<dy-bar-chart>`](../02-elements/bar-chart.md),
> [`<dy-chart-tooltip>`](../02-elements/chart-tooltip.md),
> [`<dy-chart-zoom>`](../02-elements/chart-zoom.md),
> [`<dy-donut-chart>`](../02-elements/donut-chart.md),
> [`<dy-flow>`](../02-elements/flow.md),
> [`<dy-legend>`](../02-elements/legend.md),
> [`<dy-line-chart>`](../02-elements/line-chart.md),
> [`<dy-map>`](../02-elements/map.md),
> [`<dy-scatter-chart>`](../02-elements/scatter-chart.md)

### Base Class(Extend them create your own custom elements)

> [`DuoyunLoadableBaseElement`](../02-elements/001-loadable-base.md),
> [`DuoyunResizeBaseElement`](../02-elements/002-resize-base.md),
> [`DuoyunScrollBaseElement`](../02-elements/003-scroll-base.md),
> [`DuoyunVisibleBaseElement`](../02-elements/004-visible-base.md)

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
import('https://esm.sh/duoyun-ui/elements/keyboard-access').then(({ DuoyunKeyboardAccessElement }) =>
  document.body.append(new DuoyunKeyboardAccessElement()),
);
```

For example, enable input recording mode:

```ts
import('https://esm.sh/duoyun-ui/elements/input-capture').then(({ DuoyunInputCaptureElement }) =>
  document.body.append(new DuoyunInputCaptureElement()),
);
```
