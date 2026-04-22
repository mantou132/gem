// @ts-expect-error
// You can install it as a development dependency in your own project
import confetti from 'canvas-confetti';

import type { GemBookElement } from '../../gem-book';

await customElements.whenDefined('gem-book');

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
  #animate = () => {
    confetti({
      particleCount: 50,
      origin: { x: 0.5, y: 0.5 },
    });
  };

  @mounted()
  #init = () => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      this.#animate();
      observer.disconnect();
    });
    observer.observe(this);
    return () => observer.disconnect();
  };

  render = () => html`Hello, <code>${`<gbp-import>`}</code>`;
}
