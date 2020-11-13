# 副作用

很多时候，元素需要根据某个属性执行一些副作用，比如网络请求，最后来更新文档。
这是 `GemElement.effect` 就派上用场了，它能在元素每次 `updated` 后检查依赖，如果依赖发生变化就会执行回调。

```ts
// 省略导入...

@customElement('hello-world')
class HelloWorld extends GemElement {
  @attribute src: string;

  mounted() {
    this.effect(
      () => fetch(this.src),
      () => [this.src],
    );
  }
}
```
