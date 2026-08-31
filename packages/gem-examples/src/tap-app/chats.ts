import { createState, css, GemElement, html } from '@mantou/gem';
import type { Emitter } from '@mantou/gem/lib/decorators';
import { adoptedStyle, customElement, emitter, property, template } from '@mantou/gem/lib/decorators';
import { contentsContainer } from '@mantou/tap-ui/lib/styles';
import { theme } from '@mantou/tap-ui/lib/theme';

const PAGE_SIZE = 25;

type ChatItem = {
  id: number;
  name: string;
  message: string;
  time: string;
  unread: number;
};

const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
const messages = [
  'Hey, how are you?',
  'See you tomorrow!',
  'Thanks for the help',
  'Did you see the game last night?',
  'Sure, sounds good',
  'On my way!',
  'Can you send me the file?',
  'Great idea!',
  'Let me check',
  'Happy birthday!',
];

function generateChats(page: number): ChatItem[] {
  return Array.from({ length: PAGE_SIZE }, (_, i) => ({
    id: page * PAGE_SIZE + i,
    name: names[Math.floor(Math.random() * names.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    time: `${Math.floor(Math.random() * 12 + 1)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
    unread: Math.floor(Math.random() * 5),
  }));
}

const itemStyle = css`
  :scope {
    display: block;
  }
  .action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 5em;
    height: 100%;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    border: none;
    cursor: pointer;
  }
  .action.delete {
    background: #e34850;
  }
  .item-content {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 12px;
    background: ${theme.backgroundColor};
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    border-bottom: 0.5px solid ${theme.borderColor};
  }
  .item-content:active {
    background: ${theme.hoverBackgroundColor};
  }
  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: ${theme.primaryColor};
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 600;
    font-size: 18px;
    flex-shrink: 0;
  }
  .content {
    flex: 1;
    min-width: 0;
  }
  .name {
    font-weight: 600;
    font-size: 16px;
    color: ${theme.highlightColor};
  }
  .message {
    font-size: 14px;
    color: ${theme.describeColor};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
  }
  .time {
    font-size: 12px;
    color: ${theme.describeColor};
  }
  .badge {
    background: ${theme.primaryColor};
    color: #fff;
    font-size: 11px;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    box-sizing: border-box;
  }
`;

@customElement('t-chat-item')
@adoptedStyle(itemStyle)
export class TChatItemElement extends GemElement {
  @property item?: ChatItem;
  @emitter delete: Emitter<ChatItem>;

  @template()
  #content = () => {
    const item = this.item;
    if (!item) return html``;
    return html`
      <tap-swipeout>
        <button slot="end" class="action delete" @click=${() => this.delete(item)}>Delete</button>
        <div class="item-content">
          <div class="avatar">${item.name[0]}</div>
          <div class="content">
            <div class="name">${item.name}</div>
            <div class="message">${item.message}</div>
          </div>
          <div class="meta">
            <span class="time">${item.time}</span>
            <span v-if=${item.unread > 0} class="badge">${item.unread}</span>
          </div>
        </div>
      </tap-swipeout>
    `;
  };
}

@customElement('t-chats')
@adoptedStyle(contentsContainer)
export class TChatsElement extends GemElement {
  #state = createState({ page: 0, items: generateChats(0) });

  #onBackward = () => {
    const page = this.#state.page + 1;
    this.#state({ page, items: [...this.#state.items, ...generateChats(page)] });
  };

  #onItemDelete = ({ detail: item }: CustomEvent<ChatItem>) => {
    this.#state({ items: this.#state.items.filter((i) => i.id !== item.id) });
  };

  #onRefresh = ({ detail: done }: CustomEvent<() => void>) => {
    setTimeout(() => {
      this.#state({ page: 0, items: generateChats(0) });
      done();
    }, 1000);
  };

  @template()
  #content = () => html`
    <tap-page refreshable @refresh=${this.#onRefresh}>
      <tap-navbar slot="header" title="Chats"></tap-navbar>
      <tap-list
        infinite
        .items=${this.#state.items}
        .getKey=${(item: ChatItem) => item.id}
        .renderItem=${(item: ChatItem) => html`
          <t-chat-item .item=${item} @delete=${this.#onItemDelete}></t-chat-item>
        `}
        @backward=${this.#onBackward}
      ></tap-list>
    </tap-page>
  `;
}
