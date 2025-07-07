# Remove debugger statements

Clear debug code to keep a clean code repository.

```grit
engine marzano(0.1)
language js

or {
  `debugger` => .,
  `console.$method($arg)` => . where { $arg <: not within catch_clause() },
}
```

## Test case: remove all

```js
console.log(123);
// debugger
debugger
```

```js
// debugger
```