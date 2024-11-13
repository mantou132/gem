# History

Gem exports a `history` object, which extends [History API](https://developer.mozilla.org/en-US/docs/Web/API/History).


## Property

| name                    | description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| `store`                 | `Store` to maintain history                                       |
| `basePath`              | Specify the base path (only allowed to be set once)               |
| `push`                  | Add a history                                                     |
| `pushIgnoreCloseHandle` | Add a history record, ignore the intermediate page like modal     |
| `replace`               | Replace current history                                           |
| `getParams`             | Get the value of `path`, `query`, `hash` etc. of the current page |
| `updateParams`          | Update `title` or `handle`                                        |
| `basePathStore`         | `Store` corresponding to `history.basePath`                       |

## Other

| name            | description                    |
| --------------- | ------------------------------ |
| `titleStore`    | document title                 |
| `basePathStore` | export `history.basePathStore` |