# 不是元素的模块

DuoyunUI 除了提供许多自定义元素、具有某些特定功能的基类之外，
还包含一些常用模块，它们有些被用在 DuoyunUI 的自定义元素中，有些则是独立提供的。

## Color

色彩空间转换；亮度、对比度计算。

<gbp-api src="/src/lib/color.ts"></gbp-api>

## Encode/Decode

hash, base64 等编码。

<gbp-api src="/src/lib/encode.ts"></gbp-api>

## HotKeys

轻量版的 [hotkeys](https://github.com/greena13/react-hotkeys)。

<gbp-api src="/src/lib/hotkeys.ts"></gbp-api>

## Image

压缩图片；生成 SVG 图片。

<gbp-api src="/src/lib/image.ts"></gbp-api>

## Number

格式化数字、范围调整。

<gbp-api src="/src/lib/number.ts"></gbp-api>

## Date/Time

轻量版的日期时间处理库。

<gbp-api src="/src/lib/time.ts"></gbp-api>

## Utils

一些常用的函数。

<gbp-api src="/src/lib/utils.ts"></gbp-api>

## 其他

- `animations`：使用 [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) 运行简单动画
- `cache`：提供简单的缓存方案，比如 [LRU](<https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)>) 缓存
- `icons`：内置图标，[另见](./03-customize.md#自定义图标)
- `locale`：切换、修改语言，[另见](./03-customize.md#自定义文本)
- `styles`：一些可全局共享的样式
- `theme`：内置主题，[另见](./03-customize.md#自定义主题)
- `types`：方便 Typescript 类型推导的帮助函数
