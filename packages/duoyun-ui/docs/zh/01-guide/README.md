# 简介

DuoyunUI 是使用 [Gem](https://gemjs.org/) 开发的桌面端中后台 Web UI 库，它具有 70+ 自定义元素，
除了支持常用功能外，还能轻松完成多语言、自定义主题、键盘访问等需求。DuoyunUI 旨在提供一套轻量、高性能、功能全面、[跨框架](https://custom-elements-everywhere.com/)的 UI 库。

<gbp-media src="/preview.png"></gbp-media>

## 使用方法

### NPM

安装：

```sh
npm install duoyun-ui
```

使用自定义元素：

```ts
import { render } from '@mantou/gem';

import 'duoyun-ui/elements/color-picker';

render(html`<dy-color-picker></dy-color-picker>`, document.body);
```

使用元素 API：

```ts
import { Toast } from 'duoyun-ui/elements/toast';

Toast.open('error', '发生了一个错误');
```

### ESM

DuoyunUI 支持以 ESM 的方法独立使用某一个元素，例如为你的网站添加键盘访问（按下 <kbd>f</kbd> 列出所有可聚焦元素）：

```ts
import('https://esm.sh/duoyun-ui/elements/keyboard-access').then(({ DuoyunKeyboardAccessElement }) =>
  document.body.append(new DuoyunKeyboardAccessElement()),
);
```

例如启用录屏模式：

```ts
import('https://esm.sh/duoyun-ui/elements/input-capture').then(({ DuoyunInputCaptureElement }) =>
  document.body.append(new DuoyunInputCaptureElement()),
);
```
