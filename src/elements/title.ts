import { html, GemElement, history, connectStore, customElement } from '..';

/**
 * @customElement gem-title
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

  render() {
    const { title } = history.getParams();
    document.title = title || this.textContent || '';
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
