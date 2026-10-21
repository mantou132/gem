# History

Gem exports a `history` object for app navigation on top of the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History).

## Properties and methods

| name                            | kind     | description                                                                                  |
| ------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `store`                         | property | Store containing the current history entry state                                             |
| `currentKey`                    | property | Key of the current history entry                                                             |
| `basePath`                      | property | Read or set the app base path; configure it during app initialization                        |
| `getParams()`                   | method   | Get the current entry's `path`, `query`, `hash`, and other parameters                        |
| `updateParams(params)`          | method   | Update the current entry's `title` without changing the URL; use `replace` to change the URL |
| `push(params)`                  | method   | Add a history entry                                                                          |
| `pushIgnoreCloseHandle(params)` | method   | Close and replace an existing modal-like entry; otherwise, add an entry                      |
| `replace(params)`               | method   | Replace the current history entry                                                            |
| `back()` / `forward()`          | method   | Navigate to the previous or next history entry                                               |

The `params` argument uses `UpdateHistoryParams`, including `path`, `query`, `hash`, `title`, `data`, and optional modal handlers (`open`, `close`, and `shouldClose`).

## Related exports

| name            | description                         |
| --------------- | ----------------------------------- |
| `titleStore`    | Store for the document title        |
| `basePathStore` | Store containing `history.basePath` |
