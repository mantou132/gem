import {
  adoptedStyle,
  aria,
  connectStore,
  css,
  customElement,
  GemElement,
  html,
  property,
  template,
} from '@mantou/gem';
import { mediaQuery } from '@mantou/gem/helper/mediaquery';

import type { NavItem } from '../../common/config';
import { theme } from '../helper/theme';
import { capitalize } from '../lib/utils';
import { bookStore } from '../store';

import '@mantou/gem/elements/link';

const styles = css`
  :scope:where(:not([hidden])) {
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
    background-color: rgb(from ${theme.textColor} r g b / 0.05);
    color: inherit;
    text-decoration: none;
    border-radius: ${theme.normalRound};
    display: flex;
    gap: 1.5rem;
    width: 45%;
    align-items: center;
    box-sizing: border-box;
  }
  .next {
    flex-direction: row-reverse;
  }
  gem-link,
  .arrow,
  .title {
    transition: all 0.15s ease;
  }
  gem-link:hover {
    background-color: rgb(from ${theme.textColor} r g b / 0.07);
  }
  gem-link:where(:not(.next)):hover .arrow,
  gem-link.next:hover .title {
    transform: translateX(-0.25rem);
  }
  gem-link:where(:not(.next)):hover .title,
  gem-link.next:hover .arrow {
    transform: translateX(0.25rem);
  }
  @media ${mediaQuery.PHONE} {
    gem-link {
      width: 100%;
    }
  }
`;

@customElement('gem-book-rel-link')
@connectStore(bookStore)
@adoptedStyle(styles)
@aria({ role: 'navigation' })
export class RelLink extends GemElement {
  @property links: NavItem[];

  @template()
  #content = () => {
    const { currentLinks, getCurrentLink } = bookStore;
    const currentLink = getCurrentLink?.();
    if (!currentLinks || !currentLink) return;
    const index = currentLinks.findIndex((item) => currentLink.originLink === item.originLink);
    const prev = currentLinks[index - 1];
    const next = currentLinks[index + 1];
    this.hidden = !prev && !next;
    return html`
      <gem-link v-if=${!!prev} path=${prev?.link}>
        <span class="arrow">←</span>
        <span class="title">${capitalize(prev?.title)}</span>
      </gem-link>
      <div></div>
      <gem-link v-if=${!!next} class="next" path=${next?.link}>
        <span class="arrow">→</span>
        <span class="title">${capitalize(next?.title)}</span>
      </gem-link>
    `;
  };
}
