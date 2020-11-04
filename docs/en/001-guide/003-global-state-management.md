# Global state management

Sharing data between multiple elements (called "components" in other frameworks) is a basic capability of the WebApp framework. Gem uses the "Publish/Subscribe" model to allow multiple elements to share data, and notify all elements that subscribe to the data when the data is updated. In Gem, global data is called "Store".

## Basic use

```js
// Omit import...

// create store
const store = createStore({ a: 1 });

// connect store
connect(store, function () {
  // Execute when store is updated
});

// pulish update
updateStore(store, { a: 2 });
```

As mentioned in the previous section, use `static observedStores`/`@connectStore` to connect to `Store`, in fact, their role is only to register the `update` method of the`GemElement` instance, therefore, when the `Store` is updated, the instance of the `GemElement` connected to the `Store` will call `update` to achieve automatic update.

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
