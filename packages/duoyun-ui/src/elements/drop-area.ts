import type { Emitter } from '@mantou/gem/lib/decorators';
import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  emitter,
  state,
  slot,
  aria,
  shadow,
  mounted,
} from '@mantou/gem/lib/decorators';
import { GemElement, html, createCSSSheet } from '@mantou/gem/lib/element';
import { addListener, css } from '@mantou/gem/lib/utils';

import { theme } from '../lib/theme';

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    position: relative;
  }
  .content,
  .content::before,
  .tip {
    position: absolute;
    inset: 0;
  }
  .content::before {
    content: '';
    background: ${theme.informativeColor};
    opacity: 0.3;
  }
  .content {
    z-index: 1;
    display: none;
    pointer-events: none;
  }
  :host(:state(allow-drop)) .content {
    display: block;
  }
  .tip {
    display: flex;
    font-size: 0.875em;
    align-items: center;
    justify-content: center;
    margin: 1em;
    color: white;
    border: 1px dashed currentColor;
  }
`);

/**
 * @customElement dy-drop-area
 */
@customElement('dy-drop-area')
@adoptedStyle(style)
@aria({ role: 'region' })
@shadow()
export class DuoyunDropAreaElement extends GemElement {
  @slot static unnamed: string;

  @attribute tip: string;
  /**file type */
  @attribute accept: string;
  @attribute dropeffect: DataTransfer['dropEffect'];

  @state allowDrop: boolean;
  @globalemitter change: Emitter<File[]>;
  @emitter ignore: Emitter<File[]>;
  @emitter nodata: Emitter<null>;

  get #tip() {
    return this.tip || 'Drop zone';
  }

  get #accept() {
    return this.accept || '*';
  }

  get #accepts() {
    return this.#accept.split(',').map((str) => new RegExp(`^${str.trim().replace('*', '.*')}$`));
  }

  get #dropEffect() {
    return this.dropeffect || 'copy';
  }

  #getValidFiles = (types: readonly string[], list: FileList) => {
    return types.includes('Files')
      ? [...list].filter((file) => this.#accepts.some((reg) => reg.test(file.type)))
      : undefined;
  };

  #findValidType = (types: readonly string[]) => {
    return types.find((type) => this.#accepts.some((reg) => reg.test(type)));
  };

  #onDragover = (evt: DragEvent) => {
    if (!evt.dataTransfer) return;
    const { files, types } = evt.dataTransfer;
    // can't read files
    const isFile = !!this.#getValidFiles(types, files);
    const hasValidType = !!this.#findValidType(types);
    if (isFile || hasValidType) {
      evt.dataTransfer.dropEffect = this.#dropEffect;
      this.allowDrop = true;
      evt.preventDefault();
    }
  };

  #onDragleave = () => {
    this.allowDrop = false;
  };

  #onDrop = (evt: DragEvent) => {
    evt.preventDefault();
    this.allowDrop = false;
    if (!evt.dataTransfer) return;
    const { files, types } = evt.dataTransfer;
    const validFiles = this.#getValidFiles(types, files);
    if (validFiles) {
      if (validFiles.length) this.change(validFiles);
      const set = new Set(validFiles);
      const omitFiles = [...files].filter((file) => !set.has(file));
      if (omitFiles.length) this.ignore(omitFiles);
      return;
    } else {
      const type = this.#findValidType(evt.dataTransfer.types);
      const string = type && evt.dataTransfer.getData(type);
      if (string) {
        return this.change([new File([string], 'temp', { type: this.accept })]);
      } else {
        this.nodata(null);
      }
    }
  };

  @mounted()
  #init = () => {
    addListener(this, 'dragover', this.#onDragover);
    addListener(this, 'dragleave', this.#onDragleave);
    addListener(this, 'drop', this.#onDrop);
  };

  render = () => {
    return html`
      <slot></slot>
      <div role="tooltip" class="content">
        <div class="tip">${this.#tip}</div>
      </div>
    `;
  };
}
