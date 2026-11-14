# `<tap-photo-browser>`

Full-screen photo browser like iOS Photos, supports swiping between photos, pinch and double tap to zoom, pull down to close.
It zooms from/to the `origin` element of the photo when opening and closing.

## Example

```ts
import { PhotoBrowser } from '@mantou/tap-ui/elements/photo-browser';

PhotoBrowser.open({
  items: photos.map((photo, i) => ({
    src: photo.src,
    thumbnail: photo.thumbnail,
    // Use a function when the element may be re-rendered, e.g. virtual list
    origin: () => listRef.value?.children[i],
  })),
  index,
  scrollToOrigin: true,
});
```

## API

<gbp-api name="tap-photo-browser" src="/src/elements/photo-browser.ts"></gbp-api>
