# Global state management

Sharing data between elements (also called "components") is a basic capability of the WebApp requirements. Gem uses the "Publish/Subscribe" model to allow multiple elements to share data, and notify all elements that subscribe to the data when the data is updated. In Gem, global data is called "Store".

## Basic use

```js
// Omit import...

// create store
const store = createStore({ a: 1 });

// connect store
const disconnect = connect(store, function () {
  // Execute when store is updated
});

// publish update
store({ a: 2 });

disconnect();
```

As mentioned in the previous section, use `@connectStore` to connect to `Store`, in fact, their role is only to register the `update` method of the`GemElement` instance, therefore, when the `Store` is updated, the instance of the `GemElement` connected to the `Store` will call `update` to achieve automatic update.

## Planning the store

You may have noticed that every time the `Store` is updated, the Gem element connected to the `Store` is updated. But it is very possible that the element does not use the currently modified value in the `Store`, so an invalid update will occur. You should plan your `Store` carefully to avoid any update of the `Store` from causing the entire App update.

```js
// Omit import...

const posts = createStore({ ... });
const users = createStore({ ... });
const photos = createStore({ ... });
const profiles = createStore({ ... });

// ...
```

Of course, you can define `Store` and elements together.

## Examples

In the life cycle of an element, you can easily monitor the `visibilitychange` event, and then switch the state of the element in the callback of the event, such as entering the energy-saving mode.
If this logic needs to be shared among many elements, you can use `Store` to easily accomplish this job.

<gbp-sandpack dependencies="@mantou/gem">

```js
const isSavingMode = () => document.visibilityState !== 'visible';

const store = createStore({ savingMode: isSavingMode() });

document.addEventListener('visibilitychange', () => {
  setTimeout(() => {
    store({ savingMode: isSavingMode() });
  }, 1000);
});

@customElement('my-element')
@connectStore(store)
class MyElement extends GemElement {
  render = () => {
    return html`Saving: ${store.savingMode}`;
  }
}
```

```html index.html
<my-element></my-element>
```

</gbp-sandpack>
