export class Pool {
    constructor() {
        this.currentId = 0;
        this.count = 0;
        this.pool = new Map();
    }
    add(item) {
        this.pool.set(this.count, item);
        this.count += 1;
    }
    get() {
        const item = this.pool.get(this.currentId);
        if (item) {
            this.pool.delete(this.currentId);
            this.currentId += 1;
        }
        return item;
    }
}
export function mergeObject(obj1, obj2, newObject) {
    const wrap = newObject || obj1;
    const keys = new Set(Object.keys(obj1).concat(Object.keys(obj2)));
    keys.forEach(key => {
        if (!(key in obj1)) {
            wrap[key] = obj2[key];
        }
        else if (!(key in obj2)) {
            wrap[key] = obj1[key];
        }
        else if (obj2[key] && obj2[key].constructor === Object) {
            wrap[key] = mergeObject(obj1[key], obj2[key]);
        }
        else {
            wrap[key] = obj2[key];
        }
    });
    return wrap;
}
var StorageType;
(function (StorageType) {
    StorageType["LOCALSTORAGE"] = "localStorage";
    StorageType["SESSIONSTORAGE"] = "sessionStorage";
})(StorageType || (StorageType = {}));
export class Storage {
    constructor() {
        this.cache = {};
    }
    get(key, type) {
        if (this.cache[type] && this.cache[type][key])
            return this.cache[type][key];
        let value = window[type].getItem(key);
        if (!value)
            return undefined;
        try {
            const result = JSON.parse(value);
            this.cache[type][key] = result;
            return result;
        }
        catch (e) {
            window[type].removeItem(key);
        }
    }
    getLocal(key) {
        return this.get(key, StorageType.LOCALSTORAGE);
    }
    getSession(key) {
        return this.get(key, StorageType.SESSIONSTORAGE);
    }
    set(key, value, type) {
        if (!this.cache[type])
            this.cache[type] = {};
        this.cache[type][key] = value;
        return window[type].setItem(key, JSON.stringify(value));
    }
    setLocal(key, value) {
        return this.set(key, value, StorageType.LOCALSTORAGE);
    }
    setSession(key, value) {
        return this.set(key, value, StorageType.SESSIONSTORAGE);
    }
}
//# sourceMappingURL=utils.js.map