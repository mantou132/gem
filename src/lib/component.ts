import { html, render } from 'lit-html'
import { connect, disconnect, STORE_MODULE_KEY, StoreModule } from './store'
import { Pool } from './utils'

export { html, svg, render, directive, TemplateResult } from 'lit-html'
export { repeat } from 'lit-html/directives/repeat'
export { ifDefined } from 'lit-html/directives/if-defined'

// global component render task pool
const renderTaskPool = new Pool<Function>()
const exec = () =>
  window.requestAnimationFrame(function callback(timestamp) {
    const task = renderTaskPool.get()
    if (task) {
      task()
      if (performance.now() - timestamp < 16) {
        callback(timestamp)
        return
      }
    }
    exec()
  })

exec()

declare global {
  interface ShadowRoot {
    adoptedStyleSheets: CSSStyleSheet[]
  }
}

type State = object

const isMountedSymbol = Symbol('mounted')
class BaseComponent extends HTMLElement {
  static observedAttributes?: string[]
  static observedPropertys?: string[]
  static observedStores?: StoreModule<unknown>[]
  static adoptedStyleSheets?: CSSStyleSheet[]

  state: State;
  [isMountedSymbol]: boolean

  constructor() {
    super()
    this.setState = this.setState.bind(this)
    this.willMount = this.willMount.bind(this)
    this.render = this.render.bind(this)
    this.mounted = this.mounted.bind(this)
    this.shouldUpdate = this.shouldUpdate.bind(this)
    this.update = this.update.bind(this)
    this.updated = this.updated.bind(this)
    this.disconnectStores = this.disconnectStores.bind(this)
    this.attributeChanged = this.attributeChanged.bind(this)
    this.unmounted = this.unmounted.bind(this)

    const shadowRoot = this.attachShadow({ mode: 'open' })
    const { observedPropertys, observedStores, adoptedStyleSheets } = new.target
    if (observedPropertys) {
      observedPropertys.forEach(prop => {
        let propValue: any
        Object.defineProperty(this, prop, {
          get() {
            return propValue
          },
          set(v) {
            if (v !== propValue) {
              propValue = v
              this.update()
            }
          },
        })
      })
    }
    if (observedStores) {
      observedStores.forEach(storeModule => {
        if (!storeModule[STORE_MODULE_KEY]) {
          throw new Error('`observedStores` only support store module')
        }

        connect(
          storeModule,
          this.update,
        )
      })
    }
    if (adoptedStyleSheets) {
      shadowRoot.adoptedStyleSheets = adoptedStyleSheets
    }
  }
  /**
   * @readonly do't modify
   */
  setState(payload: Partial<State>) {
    this.state = Object.assign(this.state, payload)
    this.update()
  }

  willMount() {}

  render() {
    return html``
  }

  mounted() {}

  shouldUpdate() {
    return true
  }
  /**
   * @readonly do't modify
   */
  update() {
    if (this[isMountedSymbol] && this.shouldUpdate()) {
      render(this.render(), this.shadowRoot)
      this.updated()
    }
  }

  updated() {}
  /**
   * @readonly do't modify
   */
  disconnectStores(storeModuleList: StoreModule<unknown>[]) {
    storeModuleList.forEach(storeModule => {
      disconnect(storeModule, this.update)
    })
  }

  attributeChanged(_name: string, _oldValue: string, _newValue: string) {}
  unmounted() {}

  private attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (this[isMountedSymbol]) {
      this.attributeChanged(name, oldValue, newValue)
      this.update()
    }
  }

  // adoptedCallback() {}

  private disconnectedCallback() {
    const constructor = this.constructor as typeof BaseComponent
    constructor.observedStores.forEach(storeModule => {
      disconnect(storeModule, this.update)
    })
    this.unmounted()
    this[isMountedSymbol] = false
  }
}

export class Component extends BaseComponent {
  private connectedCallback() {
    this.willMount()
    render(this.render(), this.shadowRoot)
    this.mounted()
    this[isMountedSymbol] = true
  }
}

export class AsyncComponent extends BaseComponent {
  /**
   * @readonly do't modify
   */
  update() {
    renderTaskPool.add(() => {
      if (this.shouldUpdate()) {
        render(this.render(), this.shadowRoot)
        this.updated()
      }
    })
  }

  private connectedCallback() {
    this.willMount()
    renderTaskPool.add(() => {
      render(this.render(), this.shadowRoot)
      this.mounted()
      this[isMountedSymbol] = true
    })
  }
}

const define = customElements.define.bind(customElements)
customElements.define = function(
  tagName: string,
  Class: typeof Component | typeof AsyncComponent,
  options?: ElementDefinitionOptions,
) {
  if (!customElements.get(tagName)) {
    define(tagName, Class, options)
  }
}
