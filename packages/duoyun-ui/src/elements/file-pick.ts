import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  Emitter,
  property,
  boolattribute,
  refobject,
  RefObject,
  part,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, repeat } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap } from '@mantou/gem/lib/utils';

import { icons } from '../lib/icons';
import { theme } from '../lib/theme';
import { commonHandle } from '../lib/hotkeys';
import { focusStyle } from '../lib/styles';
import { utf8ToB64 } from '../lib/encode';

import type { ImageStatus } from './image-preview';
import type { BasePickerElement } from './pick';

import './use';
import './image-preview';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    font-size: 0.875em;
    display: flex;
    flex-direction: column;
  }
  .list {
    display: contents;
    margin-block-start: 0.5em;
  }
  .item {
    cursor: default;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    min-width: 0;
    gap: 0.5em;
    line-height: 1.2;
    padding: 0.5em;
    border-radius: ${theme.normalRound};
  }
  .list .item:hover {
    background: ${theme.hoverBackgroundColor};
  }
  :host(:not([type='image'])) .list .item:first-of-type {
    margin-block-start: 0.5em;
  }
  .name {
    width: 4em;
    flex-grow: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .item:not(:hover) .name ~ .icon {
    display: none;
  }
  .icon {
    cursor: pointer;
    flex-shrink: 0;
    width: 1.2em;
  }
  .button {
    cursor: pointer;
    border-radius: ${theme.normalRound};
    border: 1px dashed ${theme.borderColor};
  }
  .button:hover {
    border-color: ${theme.textColor};
  }
  :host([type='image']:where(:not([hidden]))) {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5em, 1fr));
    grid-template-rows: max-content;
    grid-gap: 0.8em;
  }
  :host([type='image']) .item {
    border-radius: ${theme.normalRound};
    overflow: hidden;
  }
  :host([type='image']) .item.button {
    order: 999999;
    aspect-ratio: 1;
    padding: 0.5em;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
  }
  :host([type='image']) .item.button .icon {
    width: 2em;
  }
  :host([type='image']) .item.button .name {
    flex-grow: 0;
    width: auto;
    max-width: 100%;
  }
`);

type FileStatus = 'success' | 'fail' | 'uploading';

export interface FileItem extends File {
  status?: FileStatus;
  message?: string;
  /**0-100 */
  progress?: number;
}

/**
 * @customElement dy-file-pick
 */
@customElement('dy-file-pick')
@adoptedStyle(style)
@adoptedStyle(focusStyle)
export class DuoyunFilePickElement extends GemElement implements BasePickerElement {
  @part static button: string;
  @part static item: string;

  @attribute type: 'file' | 'image';
  @attribute accept: string;
  @attribute placeholder: string;
  @boolattribute directory: boolean;
  @boolattribute multiple: boolean;
  @globalemitter change: Emitter<FileItem[]>;
  @refobject inputRef: RefObject<HTMLInputElement>;

  @property value?: FileItem[];

  get #type() {
    return this.type || 'file';
  }

  get #accept() {
    return this.accept || (this.#type === 'image' ? 'image/*' : '*');
  }

  get #placeholder() {
    return this.placeholder || 'Browse';
  }

  constructor() {
    super({ delegatesFocus: true });
  }

  #onChange = () => {
    const input = this.inputRef.element!;
    if (!input.files) return;
    this.change([...((this.multiple && this.value) || []), ...input.files]);
    input.value = '';
  };

  #onRemoveItem = (item: FileItem) => {
    this.change((this.value || []).filter((e) => e !== item));
  };

  #renderFileItem = (item: FileItem) => {
    const { name, status, progress } = item;
    const getColor = () => {
      switch (status) {
        case 'success':
          return theme.positiveColor;
        case 'fail':
          return theme.negativeColor;
        default:
          return theme.textColor;
      }
    };
    return html`
      <div role="listitem" class="item" part=${DuoyunFilePickElement.item} style=${styleMap({ color: getColor() })}>
        <div class="name">${name}</div>
        ${progress ? html`<div role="progressbar">${Math.floor(progress)}%</div>` : ''}
        <slot name=${utf8ToB64(name, true)}></slot>
        <dy-use
          role="button"
          tabindex="0"
          @keydown=${commonHandle}
          class="icon"
          .element=${icons.delete}
          @click=${() => this.#onRemoveItem(item)}
        ></dy-use>
      </div>
    `;
  };

  #renderImageItem = (item: FileItem) => {
    const getStatus = (): ImageStatus => {
      switch (item.status) {
        case 'success':
          return 'positive';
        case 'fail':
          return 'negative';
        default:
          return 'default';
      }
    };
    return html`
      <dy-image-preview
        role="listitem"
        class="item"
        part=${DuoyunFilePickElement.item}
        .status=${getStatus()}
        .progress=${item.progress || 0}
        .file=${item}
        .actions=${[{ icon: icons.delete, handle: () => this.#onRemoveItem(item) }]}
      ></dy-image-preview>
    `;
  };

  render = () => {
    const renderItem = this.#type === 'file' ? this.#renderFileItem : this.#renderImageItem;

    return html`
    <input
        hidden
        type="file"
        ?multiple=${this.multiple}
        ref=${this.inputRef.ref}
        @change=${this.#onChange}
        .webkitdirectory=${this.directory}
        accept=${this.#accept}>
      </input>
      <div
        tabindex="0"
        role="button"
        part=${DuoyunFilePickElement.button}
        class="item button"
        @keydown=${commonHandle}
        @click=${() => this.showPicker()}>
        <dy-use class="icon" .element=${icons.add}></dy-use>
        <span class="name">${this.#placeholder}</span>
      </div>
      ${this.value ? html`<div role="list" class="list">${repeat(this.value, (e) => e, renderItem)}</div>` : ''}
    `;
  };

  showPicker = () => {
    this.inputRef.element!.click();
  };
}
