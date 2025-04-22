// @ts-nocheck
class MyElement {}
class MyElement1 {
    get #_src() {
        if (bool) return '#src';
        return '#src';
    }
    @effect((i) => MyElement1._dep_fn_0(i))
    #update = () => {}
    @memo(['src'])
    #__src() {
        this.#src = this.#_src;
    }
    #src;
    static _dep_fn_0 = (i) => [i.#src];
  }
class MyElement2 {
    get #src() {
        if (bool) return '#src';
        return '#src';
    }
    get #_src2() {
        return '#src';
    }
    @memo(['src'])
    #__src2() {
        this.#src2 = this.#_src2;
    }
    #src2;
}
  