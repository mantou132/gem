import { html, GemElement, customElement, connectStore, property } from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import { NavItem } from '../../common/config';
import { theme } from '../helper/theme';
import { capitalize } from '../lib/utils';
import { bookStore } from '../store';

import '@mantou/gem/elements/link';

@customElement('gem-book-rel-link')
@connectStore(bookStore)
export class RelLink extends GemElement {
  @property links: NavItem[];

  render() {
    const { currentLinks, getCurrentLink } = bookStore;
    const currentLink = getCurrentLink?.();
    if (!currentLinks || !currentLink) return;
    const index = currentLinks.findIndex((item) => currentLink.originLink === item.originLink);
    const prev = currentLinks[index - 1];
    const next = currentLinks[index + 1];
    return html`
      <style>
        :host {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          padding: 2rem 0;
          line-height: 1.5;
          border-top: 1px solid ${theme.borderColor};
          gap: 1rem;
        }
        gem-link {
          padding: 2rem;
          background-color: rgba(${theme.textColorRGB}, 0.05);
          color: inherit;
          text-decoration: none;
          border-radius: ${theme.normalRound};
          display: flex;
          gap: 1.5rem;
          transition: all 0.1s;
          width: 45%;
          align-items: center;
          box-sizing: border-box;
        }
        .next {
          flex-direction: row-reverse;
        }
        gem-link:hover {
          background-color: rgba(${theme.textColorRGB}, 0.07);
          gap: 2rem;
          padding: 2rem 1.5rem;
        }
        @media ${mediaQuery.PHONE} {
          gem-link {
            width: 100%;
          }
        }
      </style>
      ${prev ? html`<gem-link path=${prev.link}>←<span>${capitalize(prev.title)}</span></gem-link>` : null}
      <div></div>
      ${next ? html`<gem-link class="next" path=${next.link}>→<span>${capitalize(next.title)}</span></gem-link>` : null}
    `;
  }
}
