import {
  adoptedStyle,
  connectStore,
  css,
  customElement,
  effect,
  GemElement,
  history,
  html,
  shadow,
  template,
} from '@mantou/gem';

import { i18n } from '$gemkit/i18n';
import { primaryTextColor, theme } from '../lib/theme';

const gitalkUrl = 'https://esm.sh/gitalk@1.7.2';
const gitalkCSSUrl = 'https://esm.sh/gitalk@1.7.2/dist/gitalk.css';

const style = css`
  :host {
    display: block;
    margin-top: 4rem;
  }
  .gt-container .gt-meta {
    border-color: ${theme.borderColor};
  }
  .gt-container .gt-comment-username,
  .gt-container a,
  .gt-container a:hover,
  .gt-container .gt-header-controls-tip,
  .gt-container .gt-svg svg {
    color: ${primaryTextColor};
    fill: ${primaryTextColor};
  }
  .gt-container .gt-btn-preview,
  .gt-container .gt-btn-preview:hover {
    border-color: currentColor;
    background-color: transparent;
    color: ${primaryTextColor};
  }
  .gt-container .gt-btn-public,
  .gt-container .gt-btn-public:hover {
    border-color: ${primaryTextColor};
    background-color: ${primaryTextColor};
    color: ${theme.backgroundColor};
  }
  .gt-container .gt-header-textarea {
    border-color: rgb(from ${theme.textColor} r g b / 0.1);
    background-color: rgb(from ${theme.textColor} r g b / 0.05);
  }
  .gt-container .gt-header-textarea:hover,
  .gt-container .gt-header-textarea:focus {
    background-color: transparent;
  }
  .gt-container .gt-comment-content {
    background: rgb(from ${theme.primaryColor} r g b / 0.05);
  }
`;

/** 使用 Gitalk 评论，每个页面一个 issue，使用 `comment` 配置 */
@customElement('gbp-comment')
@adoptedStyle(style)
@connectStore(history.store)
@shadow()
export class GbpCommentElement extends GemElement {
  #container?: HTMLElement;

  @effect(() => [history.getParams().path])
  #render = async () => {
    const { comment, github = '' } = __GEM_BOOK_CONFIG__;
    if (!comment) return;
    const container = (this.#container ??= this.shadowRoot!.querySelector('.comment')!);
    container.innerHTML = '';
    const { default: Gitalk } = await import(/* webpackIgnore: true */ gitalkUrl);
    const [, owner, repo] = github ? new URL(github).pathname.split('/') : [];
    new Gitalk({
      clientID: comment.clientID,
      clientSecret: comment.clientSecret,
      repo: comment.repo || repo,
      owner: comment.owner || owner,
      admin: [comment.owner || owner, ...(comment.admin || [])],
      // 和旧版本一样不包括语言前缀，各语言共用评论
      id: `${location.origin}${history.getParams().path}`,
      distractionFreeMode: false,
      language: i18n.currentLanguage,
    }).render(container);
  };

  @template()
  #content = () => html`
    <link rel="stylesheet" href=${gitalkCSSUrl} />
    <div class="comment"></div>
  `;
}
