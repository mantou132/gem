// @ts-nocheck
class MyElement {}
class MyElement1 {
    @memo(['src'])
    get #_src() {
        if (bool) return this.#src = '#src';
        return this.#src = '#src';
    }
    #src;
  }
class MyElement2 {
  get #src() {
    if (bool) return '#src';
    return '#src';
  }
  @memo(['src'])
  get #_src2() {
      return this.#src2 = '#src';
  }
  #src2;
}
  