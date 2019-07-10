import { GemElement, html, history } from '../'

/**
 * @attr path
 * @attr query
 */
export class Link extends GemElement {
  static observedStores = [history.historyState]

  constructor() {
    super()
    this.onclick = this.clickHandle
  }

  get active() {
    const pathAttr = this.getAttribute('path')
    const queryAttr = this.getAttribute('query') || ''

    const { path, query } = history.location
    return path + query === pathAttr + queryAttr
  }

  clickHandle = (e: MouseEvent) => {
    const { $close } = history.location.state
    const path = this.getAttribute('path')
    const query = this.getAttribute('query') || ''
    if (!this.active) {
      e.stopPropagation()
      if ($close) {
        history.back()
        setTimeout(() => {
          history.push({ path, query })
        }, 200)
      } else {
        history.push({ path, query })
      }
    }
  }

  render() {
    if (this.active) {
      this.setAttribute('active', '')
    } else {
      this.removeAttribute('active')
    }

    return html`
      <slot></slot>
    `
  }
}

customElements.define('gem-link', Link)
