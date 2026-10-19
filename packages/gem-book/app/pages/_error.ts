import { adoptedStyle, css, GemElement, html, memo, property, template } from '@mantou/gem';
import { type ErrorData, type Params, page } from '@mantou/gemkit';

import { i18n } from '$gemkit/i18n';
import { theme } from '../lib/theme';
import { bookStore } from '../plugin';

import '@mantou/gem/elements/link';

const style = css`
  :scope {
    display: block;
    padding-block: 4rem;
    text-align: center;
  }
  h1 {
    margin: 0;
    font-size: 4rem;
  }
  p {
    color: rgb(from ${theme.textColor} r g b / 0.6);
  }
  gem-link {
    color: ${theme.primaryColor};
    text-decoration: none;
  }
`;

/** 404 显示本地化的提示，其他错误显示错误信息 */
const getMessage = ({ status, message }: ErrorData) => (status === 404 ? i18n.get('notFound') : message);

/** 错误页面，未匹配的路径和 `load` 中的 `notFound()` 也使用该页面 */
@page<Params, ErrorData>({ title: ({ data }) => getMessage(data) })
@adoptedStyle(style)
export default class ErrorPage extends GemElement {
  @property data?: ErrorData;

  @memo((i) => [i.data])
  #updateBookStore = () => bookStore({ doc: undefined });

  @template()
  #content = () => {
    const error = this.data || { status: 404, message: '' };
    return html`
      <h1>${error.status}</h1>
      <p>${getMessage(error)}</p>
      <gem-link path=${bookStore.site?.home || '/'}>${i18n.get('backHome')}</gem-link>
    `;
  };
}
