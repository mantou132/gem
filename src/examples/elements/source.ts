import { GemElement, html, customElement } from '../..';
import { EXAMPLE, FILES } from './env';

@customElement('gem-examples-source')
export class Source extends GemElement {
  state = {
    files: FILES.map((file) => ({ file: file, content: '' })),
    current: FILES[0],
  };
  render() {
    const { files, current } = this.state;
    return html`
      <style>
        :host {
          border-top: 1px solid #666;
          overflow: auto;
          grid-area: source;
          background: #eee5;
        }
        ul {
          margin: 0;
          padding: 0 1em;
          display: flex;
          gap: 1em 2em;
          border-bottom: 1px solid #eee;
          position: sticky;
          top: 0;
          background: white;
        }
        li {
          cursor: pointer;
          line-height: 2;
          list-style: none;
          border-bottom: 2px solid transparent;
        }
        li.current {
          border-color: #1ecfe3;
        }
        pre {
          margin: 0;
          padding: 1em;
        }
      </style>
      <ul>
        ${FILES.map(
          (file) =>
            html`
              <li class=${current === file ? 'current' : ''} @click=${() => this.setState({ current: file })}>
                ${file}
              </li>
            `,
        )}
      </ul>
      <pre>${files.find((e) => e.file === current)?.content}</pre>
    `;
  }
  mounted() {
    FILES.forEach(async (file) => {
      const { files } = this.state;
      const item = files.find((e) => e.file === file);
      if (!item) return;
      item.content = await (
        await fetch(`https://raw.githubusercontent.com/mantou132/gem/master/src/examples/${EXAMPLE}/${file}`)
      ).text();
      this.update();
    });
  }
}
