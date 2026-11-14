# 介绍

TapUI 是使用 [Gem](https://gemjs.org/) 开发的移动优先 UI 库，
提供适合触摸操作的元素、堆栈导航、底部面板以及自动的安全区域处理，
它也是桌面端 UI 库 [DuoyunUI](https://duoyun-ui.gemjs.org/zh/) 的基础。

## 使用

### NPM

安装：

```sh
npm install @mantou/tap-ui
```

使用 TapUI 元素：

```ts
import { html, render } from '@mantou/gem';

import '@mantou/tap-ui/elements/button';

render(html`<tap-button>Button</tap-button>`, document.body);
```

使用元素 API：

```ts
import { Toast } from '@mantou/tap-ui/elements/toast';

Toast.open('error', 'An error occurred');
```

### ESM

每个元素都可以通过 CDN 单独使用：

```ts
import('https://esm.sh/@mantou/tap-ui/elements/rolling-number');
```

## 反馈 TapUI

请访问 [GitHub](https://github.com/mantou132/gem)
