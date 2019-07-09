import { Component, html } from '../../'
import storeSet from './store'
import api from './api'

customElements.define(
  'app-page-a',
  class extends Component {
    static observedStores = [storeSet.pageA]
    mounted() {
      api.getData()
    }
    render() {
      return html`
        <slot></slot> ${storeSet.pageA.text}
      `
    }
  },
)
