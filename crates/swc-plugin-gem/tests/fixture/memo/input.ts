// @ts-nocheck
class MyElement {}
class MyElement1 {
  @memo(['src'])
  get #src() {
    if (bool) return '#src';
    return '#src';
  }
  @effect((i) => [i.#src])
  #update = () => {}
  @effect((i) => [i.#other])
  #update2 = () => {}
}
class MyElement2 {
  get #src() {
    if (bool) return '#src';
    return '#src';
  }
  @memo(['src'])
  get #src2() {
    return '#src';
  }
}
