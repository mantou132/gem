# Rewrite memo function to getter

Premise:

- `method_name` is private field & unused
- `this.#name` only set once

```grit
engine marzano(0.1)
language js

sequential {
  contains `
    $method_name = ($args) => {
      $body
    }
  ` as $memo_set where {
      $prev = before $memo_set,
      $prev <: `@memo($_)`,
      $method_name <: private_property_identifier(),
		  $program <: not contains `this.$method_name`,
      $args <: not contains `$_`,
      $body <: contains bubble($name) or {
        `return (this.$name = $value)`,
        `this.$name = $value;`,
      } as $assignment where {
        $assignment => `return $value;`,
      }
  } => `
    get $name() {
      $body
    }
  `,
  contains or {
    `$name = $_`,
    `$name: $_ = $_`,
  } => .,
}
```

## Test case: simple

```js
class A {
  #a
  @memo(() => [])
  #setA = () => {
    const result = 123;
    this.#a = result;
  }
}
```

```js
class A {
  @memo(() => [])
  get #a () {
    const result = 123;
    return result;
  }
}
```