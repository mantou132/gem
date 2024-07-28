import type { GemBookElement } from 'gem-book';

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { Gem, theme } = GemBookPluginElement;
  const { html } = Gem;

  // esm.sh 动态渲染还不支持装饰器

  class MyPlugin extends GemBookPluginElement {
    render() {
      return html`
        <style>
          my-plugin-hello {
            display: block;
            border-radius: ${theme.normalRound};
            background: rgb(from ${theme.textColor} r g b / 0.05);
            padding: 1rem;
          }
        </style>
        Hello, World
      `;
    }
  }

  customElements.define('my-plugin-hello', MyPlugin);
});
