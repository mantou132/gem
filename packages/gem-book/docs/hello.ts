import { adoptedStyle, css, customElement, GemElement, html, mounted, template } from '@mantou/gem';
// 从 esm.sh 加载，版本由 `<gbp-import>` 的 `dependencies` 指定
// @ts-expect-error
import confetti from 'canvas-confetti';

const style = css`
  :scope {
    display: block;
    padding: 1rem;
    border-radius: 0.5rem;
    background: rgb(from currentColor r g b / 0.05);
  }
`;

@customElement('my-plugin-hello')
@adoptedStyle(style)
export class MyPluginHelloElement extends GemElement {
  @mounted()
  #init = () => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      confetti({ particleCount: 50, origin: { x: 0.5, y: 0.5 } });
      observer.disconnect();
    });
    observer.observe(this);
    return () => observer.disconnect();
  };

  @template()
  #content = () => html`Hello, <code>${'<gbp-import>'}</code>`;
}
