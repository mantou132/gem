import { html, GemElement, history, connectStore, customElement, attribute } from '..';

/**
 * @customElement gem-title
 * @attr mode
 */
@connectStore(history.store)
@customElement('gem-title')
export class Title extends GemElement {
  static setTitle(title: string) {
    // 触发组件更新
    history.updateParams({ title });
  }

  constructor(isHidden: boolean) {
    super();
    this.hidden = isHidden;
  }

  @attribute mode: 'safe';

  render() {
    const { title } = history.getParams();
    const newTitle = title || this.textContent || '';

    if (this.mode !== 'safe' || newTitle) {
      document.title = newTitle;
    }

    if (this.hidden) {
      return html``;
    }
    if (!document.title) {
      return html`
        <slot></slot>
      `;
    }
    return html`
      ${document.title}
    `;
  }
}

if (document.head && !document.head.querySelector('gem-title')) {
  document.head.append(new Title(true));
}
