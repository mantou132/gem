# `<tap-photo-browser>`

类似 iOS 照片的全屏图片浏览器，支持滑动切换、双指和双击缩放、下拉关闭。
打开和关闭时从图片的 `origin` 元素缩放进出。

## Example

```ts
import { PhotoBrowser } from '@mantou/tap-ui/elements/photo-browser';

PhotoBrowser.open({
  items: photos.map((photo, i) => ({
    src: photo.src,
    thumbnail: photo.thumbnail,
    // 元素可能被重新渲染时使用函数，例如虚拟列表
    origin: () => listRef.value?.children[i],
  })),
  index,
  scrollToOrigin: true,
});
```

## API

<gbp-api name="tap-photo-browser" src="/src/elements/photo-browser.ts"></gbp-api>
