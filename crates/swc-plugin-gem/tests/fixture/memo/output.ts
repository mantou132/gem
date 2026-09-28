// @ts-nocheck
class MyElement {}
class MyElement1 {
    get #_src() {
        if (bool) return '#src';
        return '#src';
    }
    @memo(['src'])
    #__src = () => {
        this.#src = this.#_src;
    };
    #src;
    @effect((i) => MyElement1._dep_fn_0(i))
    #update = () => {}
    @effect((i) => MyElement1._dep_fn_1(i))
    #update2 = () => {}
    static _dep_fn_0 = (i) => [i.#src];
    static _dep_fn_1 = (i) => [i.#other];
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
    #__src2 = () => {
        this.#src2 = this.#_src2;
    };
    #src2;
}
