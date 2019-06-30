import { html, render } from 'lit-html';
import { connect, disconnect, STORE_MODULE_KEY } from './store';
import { Pool, mergeObject } from './utils';
export { html, render } from 'lit-html';
export { repeat } from 'lit-html/directives/repeat';
// global component render task pool
const renderTaskPool = new Pool();
const exec = () => window.requestAnimationFrame(function callback(timestamp) {
    const task = renderTaskPool.get();
    if (task) {
        task();
        if (performance.now() - timestamp < 16) {
            callback(timestamp);
            return;
        }
    }
    exec();
});
exec();
const isMountedSymbol = Symbol('mounted');
class BaseComponent extends HTMLElement {
    constructor() {
        super();
        this.state = {};
        this.setState = this.setState.bind(this);
        this.willMount = this.willMount.bind(this);
        this.render = this.render.bind(this);
        this.mounted = this.mounted.bind(this);
        this.shouldUpdate = this.shouldUpdate.bind(this);
        this.update = this.update.bind(this);
        this.updated = this.updated.bind(this);
        this.disconnectStores = this.disconnectStores.bind(this);
        this.attributeChanged = this.attributeChanged.bind(this);
        this.unmounted = this.unmounted.bind(this);
        const { observedPropertys, observedStores } = new.target;
        if (observedPropertys) {
            observedPropertys.forEach(prop => {
                let propValue;
                Object.defineProperty(this, prop, {
                    get() {
                        return propValue;
                    },
                    set(v) {
                        if (v !== propValue) {
                            propValue = v;
                            this.update();
                        }
                    },
                });
            });
        }
        if (observedStores) {
            observedStores.forEach(storeModule => {
                if (!storeModule[STORE_MODULE_KEY]) {
                    throw new Error('`observedStores` only support store module');
                }
                connect(storeModule, this.update);
            });
        }
        this.attachShadow({ mode: 'open' });
    }
    /**
     * @readonly do't modify
     */
    setState(payload) {
        this.state = mergeObject(this.state, payload);
        this.update();
    }
    willMount() { }
    render() {
        return html ``;
    }
    mounted() { }
    shouldUpdate() {
        return true;
    }
    /**
     * @readonly do't modify
     */
    update() {
        if (this.shouldUpdate()) {
            render(this.render(), this.shadowRoot);
            this.updated();
        }
    }
    updated() { }
    /**
     * @readonly do't modify
     */
    disconnectStores(storeModuleList) {
        storeModuleList.forEach(storeModule => {
            disconnect(storeModule, this.update);
        });
    }
    attributeChanged(_name, _oldValue, _newValue) { }
    unmounted() { }
    attributeChangedCallback(name, oldValue, newValue) {
        if (this[isMountedSymbol]) {
            this.attributeChanged(name, oldValue, newValue);
            this.update();
        }
    }
    // adoptedCallback() {}
    disconnectedCallback() {
        const constructor = this.constructor;
        constructor.observedStores.forEach(storeModule => {
            disconnect(storeModule, this.update);
        });
        this.unmounted();
        this[isMountedSymbol] = false;
    }
}
export class Component extends BaseComponent {
    connectedCallback() {
        this.willMount();
        render(this.render(), this.shadowRoot);
        this.mounted();
        this[isMountedSymbol] = true;
    }
}
export class SingleInstanceComponent extends BaseComponent {
    constructor() {
        super();
        if (new.target.instance) {
            throw new Error('multiple instances are not allowed');
        }
        else {
            new.target.instance = this;
        }
    }
}
export class AsyncComponent extends BaseComponent {
    /**
     * @readonly do't modify
     */
    update() {
        renderTaskPool.add(() => {
            if (this.shouldUpdate()) {
                render(this.render(), this.shadowRoot);
                this.updated();
            }
        });
    }
    connectedCallback() {
        this.willMount();
        renderTaskPool.add(() => {
            render(this.render(), this.shadowRoot);
            this.mounted();
            this[isMountedSymbol] = true;
        });
    }
}
//# sourceMappingURL=component.js.map