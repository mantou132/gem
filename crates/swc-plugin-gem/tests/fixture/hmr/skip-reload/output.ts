// @ts-nocheck
class GemError extends Error {
    #code;
    constructor(msg){
        super(msg);
        this.#code = 1;
    }
    get #code() {
        return this.#code;
    }
}
