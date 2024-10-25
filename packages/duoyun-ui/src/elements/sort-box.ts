import { GemElement, createCSSSheet } from '@mantou/gem/lib/element';
import { adoptedStyle, boolattribute, customElement, emitter, mounted, type Emitter } from '@mantou/gem/lib/decorators';
import { addListener } from '@mantou/gem/lib/utils';

import { blockContainer } from '../lib/styles';
import { theme } from '../lib/theme';

import { DuoyunGestureElement } from './gesture';
import type { PanEventDetail } from './gesture';

const style = createCSSSheet`
  :where(dy-sort-item[handle], dy-sort-handle):state(grabbing) {
    cursor: grabbing;

    * {
      pointer-event: none;
    }
  }
  dy-sort-item[handle]:state(grabbing),
  dy-sort-item:has(:state(grabbing)) {
    position: relative;
    z-index: ${theme.popupZIndex};
  }
`;

export type SortEventDetail = { new: number; old: number };

@customElement('dy-sort-box')
@adoptedStyle(style)
@adoptedStyle(blockContainer)
export class DuoyunSortBoxElement extends GemElement {
  @emitter sort: Emitter<SortEventDetail>;

  #listeners: (undefined | (() => void)[])[] = [];

  #removeListeners = () => {
    this.#listeners.forEach((e) => e?.forEach((ee) => ee()));
  };

  #listen = () => {
    this.#removeListeners();
    const items = [...this.querySelectorAll<DuoyunSortItemElement>('dy-sort-item')];
    const handles = items.map((item) =>
      item.handle ? item : item.querySelector<DuoyunSortHandleElement>('dy-sort-handle'),
    );
    this.#listeners = handles.map((e, index) => {
      if (!e) return;
      const item = items[index];
      let itemTranslate = [0, 0];
      const removeEnd = addListener(e, 'end', ({ detail }: CustomEvent<PointerEvent>) => {
        itemTranslate = [0, 0];
        item.style.translate = 'none';
        const itemsRect = items.map((i) => i.getBoundingClientRect());
        const newIndex = itemsRect.findIndex(
          (i) => i.left <= detail.x && i.right > detail.x && i.top <= detail.y && i.bottom > detail.y,
        );
        if (newIndex === -1) return;
        this.sort({ new: newIndex, old: index });
      });
      const removePan = addListener(e, 'pan', ({ detail }: CustomEvent<PanEventDetail>) => {
        itemTranslate[0] += detail.x;
        itemTranslate[1] += detail.y;
        item.style.translate = itemTranslate.map((p) => p + 'px').join(' ');
      });
      return [removeEnd, removePan];
    });
  };

  @mounted()
  #init = () => {
    this.#listen();
    const ob = new MutationObserver(this.#listen);
    ob.observe(this, { subtree: true, childList: true });
    return () => {
      ob.disconnect();
      this.#removeListeners();
    };
  };
}

@customElement('dy-sort-item')
export class DuoyunSortItemElement extends DuoyunGestureElement {
  @boolattribute handle: boolean;
}

@customElement('dy-sort-handle')
export class DuoyunSortHandleElement extends DuoyunGestureElement {}
