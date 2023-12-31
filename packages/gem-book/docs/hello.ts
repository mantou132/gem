import type { GemBookElement } from 'gem-book';

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { Gem, theme } = GemBookPluginElement;
  const { html } = Gem;

  class MyPlugin extends GemBookPluginElement {
    render() {
      return html`
        <style>
          :host {
            display: block;
            border-radius: ${theme.normalRound};
            background: rgba(${theme.textColorRGB}, 0.05);
            padding: 1rem;
          }
        </style>
        Hello, World
      `;
    }
  }

  customElements.define('my-plugin-hello', MyPlugin);
});
