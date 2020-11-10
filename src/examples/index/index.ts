import { GemElement, html, customElement, version } from '../..';

const getGitPageUrl = (name: string) => `../${name}/`;

@customElement('app-root')
class App extends GemElement {
  render = () => {
    const examples = (process.env.EXAMPLES || '').split(',');
    return html`
      <dl>
        <dt>version:</dt>
        <dd>${version}</dd>
        ${examples.map(
          (name) => html`
            <dt>${name}:</dt>
            <dd><a href=${getGitPageUrl(name)}>${new URL(getGitPageUrl(name), location.href)}</a></dd>
          `,
        )}
      </dl>
    `;
  };
}

document.body.append(new App());
