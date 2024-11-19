// @ts-nocheck
class MyElement {
    @memo(['src'])
    get #_src() {
        return this.#src = '#src';
    }
    #src;
  }
  