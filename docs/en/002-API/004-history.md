# History

| property                | description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| `store`                 | `Store` to maintain history                                       |
| `basePath`              | Specify the base path (only allowed to be set once)               |
| `push`                  | Add a history                                                     |
| `pushIgnoreCloseHandle` | Add a history record, ignore the intermediate page like modal     |
| `replace`               | Replace current history                                           |
| `getParams`             | Get the value of `path`, `query`, `hash` etc. of the current page |
| `updateParams`          | Update `title` or `handle`                                        |
| `basePathStore`         | `Store` corresponding to `history.basePath`                       |
