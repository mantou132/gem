import {
  adoptedStyle,
  customElement,
  part,
  property,
  slot,
  state,
  refobject,
  RefObject,
  emitter,
  Emitter,
  boolattribute,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, LinkedList, LinkedListItem, styled, styleMap } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';
import { blockContainer } from '../lib/styles';
import { findScrollContainer } from '../lib/element';
import { once, throttle } from '../lib/utils';

import type { Status } from './status-light';
import { DuoyunVisibleBaseElement, visibilityObserver } from './base/visible';
import { DuoyunResizeBaseElement } from './base/resize';

import './avatar';
import './divider';

export type Item = {
  title: string | TemplateResult;
  description?: string | TemplateResult;
  avatar?: string | TemplateResult;
  status?: Status;
};

type Key = string | number;

type State = {
  beforeHeight: number;
  renderList: Key[];
  afterHeight: number;
};

export type PersistentState = State & {
  scrollTop: number;
};

const outsideStyle = createCSSSheet(css`
  :host {
    grid-column: 1/-1;
  }
`);

@customElement('dy-list-outside')
@adoptedStyle(blockContainer)
@adoptedStyle(outsideStyle)
export class DuoyunOutsideElement extends DuoyunVisibleBaseElement {}

const style = createCSSSheet(css`
  :host([infinite]) {
    overflow-anchor: none;
  }
`);

/**
 * @customElement dy-list
 */
@customElement('dy-list')
@adoptedStyle(style)
@adoptedStyle(blockContainer)
export class DuoyunListElement extends GemElement<State> {
  @part static item: string;
  @part static beforeOutside: string;
  @part static afterOutside: string;

  @slot static before: string;
  @slot static after: string;

  /**@deprecated */
  @property data?: any[];
  @property items?: any[];
  @property renderItem?: (item: any) => TemplateResult;
  @boolattribute debug: boolean;

  /**enable infinite scroll, virtualization render */
  @boolattribute infinite: boolean;
  /**If infinite scrolling is enabled, this method must be provided */
  @property getKey?: (item: any) => Key;
  @emitter forward: Emitter;
  @emitter backward: Emitter;
  @emitter itemshow: Emitter<any>;
  @refobject beforeItemRef: RefObject<DuoyunOutsideElement>;
  @refobject afterItemRef: RefObject<DuoyunOutsideElement>;

  get #items() {
    return this.items || this.data;
  }

  get #beforeVisible() {
    return this.beforeItemRef.element?.visible;
  }

  get #afterVisible() {
    return this.afterItemRef.element?.visible;
  }

  // 防止网格布局渲染不是整数行
  get #appendCount() {
    return this.#itemCountPerScreen - (this.state.renderList.length % this.#itemColumnCount);
  }

  constructor() {
    super({ delegatesFocus: true });
    this.internals.role = 'list';
  }

  state: State = {
    beforeHeight: 0,
    renderList: [],
    afterHeight: 0,
  };

  #log = (...args: any) => {
    // eslint-disable-next-line no-console
    this.debug && console.log(...args);
  };

  #isEnd = (direction: 0 | -1) => {
    const item = this.#items?.at(direction);
    const key = this.state.renderList.at(direction);
    return (item === undefined && key === undefined) || key === this.getKey!(item);
  };

  #setState = (state: Partial<State>) => {
    this.#log(state);
    this.setState(state);
  };

  #isLeftItem = (count: number) => !(count % this.#itemColumnCount);

  // 没有渲染内容时
  #reLayout = (options: { silent?: boolean } = {}) => {
    this.#log('reLayout');
    const { beforeHeight, afterHeight, renderList } = this.state;
    // 初始状态
    if (!renderList.length && !beforeHeight && !afterHeight) {
      this.#appendAfter(this.#itemLinked.first);
      return;
    }

    const list: Key[] = [];
    const thisRect = this.getBoundingClientRect();
    const containerRect = this.scrollContainer.getBoundingClientRect();
    // Padding?
    const firstElementY = this === this.scrollContainer ? thisRect.top - this.scrollTop : thisRect.top;
    // 上下安全余量
    const safeHeight = containerRect.height;
    // TODO: Improve performance
    let beforeHeightSum = 0;
    let renderHeightSum = 0;
    let afterHeightSum = 0;
    let node = this.#itemLinked.first;
    let count = 0;
    while (node) {
      const ele = this.#getElement(node.value);

      const blockSize = this.#isLeftItem(count) ? ele.borderBoxSize.blockSize : 0;
      const y = firstElementY + beforeHeightSum + renderHeightSum;

      if (y > containerRect.bottom + safeHeight) {
        afterHeightSum += blockSize;
      } else if (y + blockSize > containerRect.top - safeHeight) {
        list.push(node.value);
        renderHeightSum += blockSize;
      } else {
        beforeHeightSum += blockSize;
      }
      count++;
      node = node.next;

      // 让没有渲染过的项目至少存在一个，预留一点滚动空间
      if (!ele.borderBoxSize.blockSize) {
        break;
      }
    }
    this.#setState({ beforeHeight: beforeHeightSum, renderList: list, afterHeight: afterHeightSum });

    if (options.silent) return;

    // 如果滚动到最前/后时
    if (this.#isEnd(0)) {
      this.forward(null);
    }
    if (this.#isEnd(-1)) {
      this.backward(null);
    }
  };

  #onBeforeItemVisible = () => {
    this.#log('onBeforeItemVisible');

    if (this.#isEnd(0)) {
      this.#setState({ beforeHeight: 0 });
      this.forward(null);
      return;
    }

    // 隐藏后面不可见的
    let afterHeight = 0;
    let len = this.state.renderList.length;
    let count = 0;
    for (let i = len - 1; i >= 0; i--) {
      const ele = this.#getElement(this.state.renderList[i]);
      if (!ele.visible) {
        if (this.#isLeftItem(count)) afterHeight += ele.borderBoxSize.blockSize;
        len--;
      }
      count++;
    }
    this.#setState({
      // 同一行 visible 值可能不一样，但高度已经被计算
      renderList: this.state.renderList.splice(0, len - (len % this.#itemColumnCount)),
      afterHeight: this.state.afterHeight + afterHeight,
    });

    const newRenderedFirstKey = this.state.renderList.at(0);
    if (!newRenderedFirstKey) {
      this.#reLayout();
      return;
    }

    // 显示前面的
    this.#appendBefore(this.#itemLinked.find(newRenderedFirstKey)?.prev);
  };

  #appendBefore = (startNode?: LinkedListItem<Key>) => {
    const appendList: Key[] = [];
    let node = startNode;
    let beforeHeight = 0;
    for (let i = 0; i < this.#appendCount; i++) {
      if (!node) break;
      if (this.#isLeftItem(i)) beforeHeight += this.#getElement(node.value).borderBoxSize.blockSize;
      appendList.unshift(node.value);
      node = node.prev;
    }
    this.#setState({
      renderList: appendList.concat(this.state.renderList),
      // itemHeight 改变，这里可能为负值，需要矫正？
      beforeHeight: Math.max(0, this.state.beforeHeight - beforeHeight),
    });
  };

  #onAfterItemVisible = () => {
    this.#log('onAfterItemVisible');

    if (this.#isEnd(-1)) {
      this.#setState({ afterHeight: 0 });
      this.backward(null);
      return;
    }

    // 隐藏前面不可见的
    let len = 0;
    let beforeHeight = 0;
    let count = 0;
    for (const key of this.state.renderList) {
      const ele = this.#getElement(key);
      if (!ele.visible) {
        len++;
        if (this.#isLeftItem(count)) beforeHeight += ele.borderBoxSize.blockSize;
      }
      count++;
    }
    // 同一行 visible 值可能不一样，但高度已经被计算
    const mod = len % this.#itemColumnCount;
    const difference = mod ? this.#itemColumnCount - mod : 0;
    this.#setState({
      renderList: this.state.renderList.splice(len + difference),
      beforeHeight: this.state.beforeHeight + beforeHeight,
    });

    const newRenderedLastKey = this.state.renderList.at(-1);
    if (!newRenderedLastKey) {
      this.#reLayout();
      return;
    }

    // 显示后面的
    this.#appendAfter(this.#itemLinked.find(newRenderedLastKey)?.next);
  };

  #appendAfter = (node?: LinkedListItem<Key>) => {
    const appendList: Key[] = [];
    let afterHeight = 0;
    for (let i = 0; i < this.#appendCount; i++) {
      if (!node) break;
      appendList.push(node.value);
      if (this.#isLeftItem(i)) afterHeight += this.#getElement(node.value).borderBoxSize.blockSize;
      node = node.next;
    }
    this.#setState({
      renderList: this.state.renderList.concat(appendList),
      afterHeight: Math.max(0, this.state.afterHeight - afterHeight),
    });
  };

  // 初次渲染可能没有排满, 初始值 itemCountPerScreen 一般能够排满
  // 不重复执行
  // 延迟执行确保读取 afterVisible 正确
  #initCheckOnce = once((silent: boolean) => setTimeout(() => this.#afterVisible && this.#reLayout({ silent }), 60));

  #itemHeight = 0;
  #itemColumnCount = 1;
  // 跟用户初始 Items 长度相同会触发两次 backward 事件，用户配置？
  #itemCountPerScreen = 19;
  #onItemResize = throttle(
    ({ target }) => {
      const ele = target as DuoyunListItemElement | null;
      if (ele?.borderBoxSize.blockSize) {
        this.#initCheckOnce(this.items!.length > this.#itemCountPerScreen);

        this.#itemColumnCount = Math.floor(this.scrollContainer.clientWidth / ele.borderBoxSize.inlineSize);
        this.#itemHeight = ele.borderBoxSize.blockSize;
        this.#itemCountPerScreen =
          Math.ceil(this.scrollContainer.clientHeight / this.#itemHeight) * this.#itemColumnCount;
      }
    },
    1000,
    { leading: true },
  );

  #keyElementMap = new Map<any, DuoyunListItemElement>();
  #getElement = (key: Key) => {
    if (!this.#keyElementMap.has(key)) {
      const ele = new DuoyunListItemElement();
      ele.setAttribute('part', DuoyunListElement.item);
      ele.addEventListener('resize', this.#onItemResize);
      ele.addEventListener('show', () => this.itemshow(this.#keyItemMap.get(key)));
      ele.intersectionRoot = this.scrollContainer;
      ele.borderBoxSize.blockSize = this.#itemHeight;
      this.#keyElementMap.set(key, ele);
    }
    const ele = this.#keyElementMap.get(key)!;
    ele.item = this.#keyItemMap.get(key);
    ele.renderItem = this.renderItem;
    return ele;
  };

  #reCheck = () => {
    if (this.#beforeVisible) this.#onBeforeItemVisible();
    if (this.#afterVisible) this.#onAfterItemVisible();
  };

  // 用于保证渲染内容，但不应该运行太频繁
  #onScroll = throttle(
    () => {
      const { renderList } = this.state;
      if (renderList.length && renderList.every((key) => !this.#getElement(key).visible)) {
        this.#reLayout();
      } else {
        // 防止只显示半屏
        this.#reCheck();
      }
    },
    110,
    { maxWait: 120 },
  );

  #itemLinked = new LinkedList<Key>();
  #keyItemMap = new Map<Key, any>();

  #initState?: PersistentState;

  willMount = () => {
    this.#setState({ ...this.#initState });

    this.memo(
      ([items], oldDeps) => {
        if (this.infinite && items) {
          // 向前（上）加载数据，必须是列数的倍数
          if (items.length && oldDeps?.[0]?.length) {
            let beforeHeight = 0;
            for (let i = 0; i < items.length; i++) {
              if (this.getKey!(items[i]) === this.getKey!(oldDeps[0][0])) break;
              if (this.#isLeftItem(i)) beforeHeight += this.#itemHeight;
            }
            if (beforeHeight) {
              this.#setState({ beforeHeight: this.state.beforeHeight + beforeHeight });
              // 等待渲染后再滚动
              queueMicrotask(() => {
                this.scrollContainer.scrollBy({
                  left: 0,
                  top: beforeHeight,
                  behavior: 'instant',
                });
              });
            }
          }

          // TODO: Improve performance
          this.#itemLinked = new LinkedList();
          this.#keyItemMap = new Map();
          items.forEach((item) => {
            const key = this.getKey!(item);
            this.#keyItemMap.set(key, item);
            this.#itemLinked.add(key);
          });
        }
      },
      () => [this.#items],
    );
  };

  mounted = () => {
    this.scrollContainer = findScrollContainer(this) || document.documentElement;
    this.scrollContainer.scrollTo(0, this.#initState?.scrollTop || 0);

    this.effect(() => {
      this.scrollContainer.addEventListener('scroll', this.#onScroll);
      return () => {
        this.scrollContainer.removeEventListener('scroll', this.#onScroll);
      };
    });

    // 已经等到新值需要检查
    this.effect(this.#reCheck, () => [this.#items]);
  };

  render = () => {
    const { beforeHeight, afterHeight, renderList } = this.state;
    return html`
      <slot name=${DuoyunListElement.before}></slot>
      ${this.infinite
        ? html`
            <dy-list-outside
              ref=${this.beforeItemRef.ref}
              part=${DuoyunListElement.beforeOutside}
              .intersectionRoot=${this.scrollContainer}
              @show=${this.#onBeforeItemVisible}
              style=${styleMap({ height: `${beforeHeight}px` })}
            ></dy-list-outside>
            ${renderList.map((key) => this.#getElement(key))}
            <dy-list-outside
              ref=${this.afterItemRef.ref}
              part=${DuoyunListElement.afterOutside}
              .intersectionRoot=${this.scrollContainer}
              @show=${this.#onAfterItemVisible}
              style=${styleMap({ height: `${afterHeight}px` })}
            >
            </dy-list-outside>
          `
        : this.#items?.map(
            (item) => html`
              <dy-list-item part=${DuoyunListElement.item} .item=${item} .renderItem=${this.renderItem}></dy-list-item>
            `,
          )}
      <slot name=${DuoyunListElement.after}>
        <!-- 无限滚动时避免找不到 "dy-list-outside", e.g: dy-list docs -->
        <div slot="after" style="height: 1px"></div>
      </slot>
    `;
  };

  /**Setter: initState */
  set persistentState(initState: PersistentState | undefined) {
    this.#initState = initState;
  }

  /**Getter */
  get persistentState(): PersistentState {
    return {
      ...this.state,
      scrollTop: this.scrollContainer.scrollTop,
    };
  }

  // 切换容器？
  scrollContainer = document.documentElement;
}

const itemStyle = createCSSSheet({
  // 避免该样式干扰用户样式
  item: styled.class`
    display: flex;
    align-items: center;
    gap: 1em;
    font-size: 0.875em;
    padding: 0.5em;
    & .avatar {
      display: flex;
    }
    & .content {
      display: flex;
      flex-direction: column;
      gap: 0.2em;
      min-width: 0;
    }
    & .title,
    & .description {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    & .title {
      font-weight: 500;
    }
    & .description {
      color: ${theme.describeColor};
    }
  `,
});

@customElement('dy-list-item')
@adoptedStyle(blockContainer)
@adoptedStyle(itemStyle)
export class DuoyunListItemElement extends DuoyunResizeBaseElement implements DuoyunVisibleBaseElement {
  @emitter show: Emitter;
  @emitter hide: Emitter;

  @state visible: boolean;
  @property intersectionRoot?: Element | Document;
  @property intersectionRootMargin?: string;

  @property item?: any;
  @property renderItem?: (item: any) => TemplateResult;

  constructor() {
    super({ delegatesFocus: true });
    this.internals.role = 'listitem';
    this.effect(
      () => visibilityObserver(this),
      () => [this.intersectionRoot],
    );
  }

  #renderDefaultItem = ({ title, avatar, description, status }: Item) => {
    return html`
      <div class=${itemStyle.item}>
        ${!avatar
          ? ''
          : html`
              <div class="avatar">
                ${typeof avatar === 'string'
                  ? html`<dy-avatar src=${avatar} alt="Avatar" .status=${status as Status}></dy-avatar>`
                  : avatar}
              </div>
            `}
        <div class="content">
          <div class="title">${title}</div>
          <div class="description">${description}</div>
        </div>
      </div>
      <dy-divider></dy-divider>
    `;
  };

  render = () => {
    if (this.item === undefined) return html``;
    return this.renderItem
      ? this.renderItem(this.item)
      : typeof this.item === 'object'
        ? this.#renderDefaultItem(this.item)
        : this.item;
  };
}
