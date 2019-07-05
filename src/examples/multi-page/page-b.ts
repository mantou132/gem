import { Component, html } from '../../'
import store from './store'

customElements.define(
  'app-page-b',
  class extends Component {
    static observedStores = [store.pageB]
    render() {
      return html`
        <slot></slot> ${store.pageB.text}
      `
    }
  },
)
