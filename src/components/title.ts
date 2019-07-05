import { html, Component, history, updateStore } from '../'

class Title extends Component {
  static observedStores = [history.historyState]

  static setTitle(documentTitle: string) {
    const { list, currentIndex } = history.historyState
    list.splice(currentIndex, 1, {
      ...list[currentIndex],
      title: documentTitle,
    })
    updateStore(history.historyState, {
      list,
    })
  }

  private documentTitle: string

  constructor(isHidden: boolean) {
    super()
    const { title } = history.location
    this.documentTitle = title
    this.hidden = isHidden
  }

  shouldUpdate() {
    const { title } = history.location
    if (title !== this.documentTitle) {
      this.documentTitle = title
      return true
    }
    return false
  }

  render() {
    const { list, currentIndex } = history.historyState
    const { title } = list[currentIndex]

    document.title = title
    if (this.hidden) return super.render()
    if (!title)
      return html`
        <slot></slot>
      `
    return html`
      ${title}
    `
  }
}

customElements.define('gem-title', Title)
document.head.append(new Title(true))
