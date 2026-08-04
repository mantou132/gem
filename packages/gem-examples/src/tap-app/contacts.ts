import { adoptedStyle, customElement, template } from '@mantou/gem/lib/decorators';
import { createState, css, GemElement, html } from '@mantou/gem/lib/element';
import { classMap } from '@mantou/gem/lib/utils';
import { contentsContainer } from 'tap-ui/lib/styles';
import { theme } from 'tap-ui/lib/theme';

import 'tap-ui/elements/list-index';
import 'tap-ui/elements/navbar';
import 'tap-ui/elements/page';
import 'tap-ui/elements/searchbar';

type Contact = {
  name: string;
  phone: string;
};

const contacts: Contact[] = [
  { name: 'Alice Anderson', phone: '+1 415 555 0120' },
  { name: 'Amelia Adams', phone: '+1 415 555 0121' },
  { name: 'Benjamin Brooks', phone: '+1 212 555 0140' },
  { name: 'Charlotte Carter', phone: '+1 206 555 0160' },
  { name: 'Daniel Diaz', phone: '+1 305 555 0180' },
  { name: 'Eleanor Evans', phone: '+44 20 7946 0201' },
  { name: 'Felix Foster', phone: '+49 30 9018 2200' },
  { name: 'Grace Green', phone: '+1 312 555 0220' },
  { name: 'Henry Harris', phone: '+1 617 555 0240' },
  { name: 'Isabella Irving', phone: '+1 503 555 0260' },
  { name: 'Jack Johnson', phone: '+1 702 555 0280' },
  { name: 'Kai Keller', phone: '+49 40 4285 0300' },
  { name: 'Liam Lewis', phone: '+353 1 555 0320' },
  { name: 'Mia Morgan', phone: '+1 404 555 0340' },
  { name: 'Noah Nelson', phone: '+1 213 555 0360' },
  { name: 'Olivia Ortiz', phone: '+34 91 555 0380' },
  { name: 'Peter Parker', phone: '+1 718 555 0400' },
  { name: 'Quinn Quinn', phone: '+1 202 555 0420' },
  { name: 'Ruby Roberts', phone: '+44 161 555 0440' },
  { name: 'Sophia Scott', phone: '+1 512 555 0460' },
  { name: 'Theo Turner', phone: '+1 303 555 0480' },
  { name: 'Uma Underwood', phone: '+1 646 555 0500' },
  { name: 'Victor Vaughn', phone: '+1 408 555 0520' },
  { name: 'Willow Wright', phone: '+61 2 5550 0540' },
  { name: 'Xavier Xu', phone: '+86 21 5550 0560' },
  { name: 'Yara Young', phone: '+971 4 555 0580' },
  { name: 'Zoe Zimmerman', phone: '+1 917 555 0600' },
];

const style = css`
  .heading {
    position: sticky;
    z-index: 1;
    inset-block-start: 0;
    margin: 0;
    padding: 0.35em 1em;
    background: ${theme.lightBackgroundColor};
    color: ${theme.describeColor};
    font-size: 0.75em;
    line-height: 1.4;
  }
  .contact {
    display: grid;
    grid-template-columns: 2.5em minmax(0, 1fr);
    align-items: center;
    gap: 0.75em;
    min-height: 3.75em;
    padding: 0.55em 1em;
    box-sizing: border-box;
    border-block-end: 1px solid ${theme.borderColor};
    background: ${theme.backgroundColor};
  }
  .avatar {
    display: grid;
    place-items: center;
    width: 2.5em;
    height: 2.5em;
    border-radius: 50%;
    color: white;
    font-weight: 600;
  }
  .avatar.color-0 {
    background: ${theme.primaryColor};
  }
  .avatar.color-1 {
    background: ${theme.positiveColor};
  }
  .avatar.color-2 {
    background: ${theme.noticeColor};
  }
  .avatar.color-3 {
    background: ${theme.informativeColor};
  }
  .name {
    overflow: hidden;
    color: ${theme.highlightColor};
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .phone {
    margin-block-start: 0.15em;
    color: ${theme.describeColor};
    font-size: 0.8125em;
  }
  .empty {
    padding: 3em 1em;
    color: ${theme.describeColor};
    text-align: center;
  }
`;

@customElement('tap-app-contacts')
@adoptedStyle(contentsContainer)
@adoptedStyle(style)
export class TapAppContactsElement extends GemElement {
  #state = createState({ query: '' });

  get #groups() {
    const query = this.#state.query.trim().toLocaleLowerCase();
    const filtered = query
      ? contacts.filter(({ name, phone }) => `${name} ${phone}`.toLocaleLowerCase().includes(query))
      : contacts;
    return Map.groupBy(filtered, ({ name }) => name[0].toLocaleUpperCase());
  }

  #onSearch = ({ detail }: CustomEvent<string>) => this.#state({ query: detail });

  @template()
  #content = () => {
    const groups = this.#groups;
    return html`
      <tap-page>
        <tap-navbar slot="header" title="Contacts"></tap-navbar>
        <tap-searchbar .value=${this.#state.query} @change=${this.#onSearch}></tap-searchbar>
        <div class="results">
          ${[...groups].map(
            ([letter, items], groupIndex) => html`
              <section class="group" data-list-index=${letter}>
                <h2 class="heading">${letter}</h2>
                ${items.map(
                  ({ name, phone }) => html`
                    <div class="contact">
                      <div class=${classMap({ avatar: true, [`color-${groupIndex % 4}`]: true })}>
                        ${name
                          .split(' ')
                          .map((part) => part[0])
                          .join('')}
                      </div>
                      <div>
                        <div class="name">${name}</div>
                        <div class="phone">${phone}</div>
                      </div>
                    </div>
                  `,
                )}
              </section>
            `,
          )}
          <div v-if=${groups.size === 0} class="empty">No matching contacts</div>
        </div>
        <tap-list-index .items=${[...groups.keys()]}></tap-list-index>
      </tap-page>
    `;
  };
}
