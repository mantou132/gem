# Web App

TapUI provides helpers to set up a mobile web app, they also work in hybrid apps such as Tauri or Capacitor.

## Initialize the app

`initApp` sets the viewport, disables pinch-zoom and overscroll, keeps the body above the virtual keyboard,
and renders `template` as the root page of the global [`Stack`](../02-elements/stack.md):

```ts
import { initApp } from '@mantou/tap-ui/helper/webapp';

initApp({
  template: html`<my-app></my-app>`,
});
```

Options:
- `template`: The root page of the global `Stack`
- `layout`: Rendered into `body` instead of the root page, for layouts beside the stack (e.g. a split view sidebar); its `<tap-stack>` becomes the global `Stack`
- `onRootClose`: Called when closing the root page (`Stack.pop()` or swiping back on it), e.g. to leave the app
- `serviceWorkerScript`: Register a service worker, otherwise the registered one is unregistered

## Web app manifest

`getWebManifestURL` turns a manifest object into a data URL, relative paths are resolved against the current origin.
Use `<tap-reflect>` (same as [`<gem-reflect>`](https://gemjs.org/en/api/built-in-element#gem-reflect)) to render it into `<head>`:

```ts
import { getWebManifestURL, initApp } from '@mantou/tap-ui/helper/webapp';

initApp({
  template: html`
    <tap-reflect>
      <link rel="manifest" href=${getWebManifestURL({ name: 'My App', start_url: '/', display: 'fullscreen' })} />
    </tap-reflect>
    <my-app></my-app>
  `,
});
```

## Error handling

Import `@mantou/tap-ui/helper/error` to handle uncaught errors and unhandled promise rejections,
they are logged by default, customize it with `errorHandler`:

```ts
import { errorHandler } from '@mantou/tap-ui/helper/base/error';
import { Toast } from '@mantou/tap-ui/elements/toast';

import '@mantou/tap-ui/helper/error';

errorHandler.ignoreRules.push(/NetworkError/);
errorHandler.show = (message) => Toast.open('error', message);
```
