import { Component, html } from '../../src'
import store from './store'
import api from './api'

customElements.define(
  'app-page-a',
  class extends Component {
    static observedStores = [store.pageA]
    mounted() {
      api.getData()
    }
    render() {
      return html`
        <slot></slot> ${store.pageA.text}
      `
    }
  },
)
