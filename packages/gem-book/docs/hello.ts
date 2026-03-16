import confetti from 'canvas-confetti';
import type { GemBookElement } from 'gem-book';

customElements.whenDefined('gem-book').then(() => {
  const { GemBookPluginElement } = customElements.get('gem-book') as typeof GemBookElement;
  const { Gem, theme } = GemBookPluginElement;
  const { html, adoptedStyle, css, customElement, mounted } = Gem;

  const style = css`
    my-plugin-hello {
      display: block;
      border-radius: ${theme.normalRound};
      background: rgb(from ${theme.textColor} r g b / 0.05);
      padding: 1rem;
    }
  `;

  @customElement('my-plugin-hello')
  @adoptedStyle(style)
  class _MyPlugin extends GemBookPluginElement {
    @mounted()
    #init = () => {
      confetti({
        particleCount: 5,
        origin: { x: 0.5, y: 0.5 },
      });
    };

    render = () => html`Hello, World`;
  }
});
