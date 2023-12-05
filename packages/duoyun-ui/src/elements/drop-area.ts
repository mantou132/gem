import {
  adoptedStyle,
  customElement,
  attribute,
  globalemitter,
  emitter,
  Emitter,
  state,
} from '@mantou/gem/lib/decorators';
import { GemElement, html } from '@mantou/gem/lib/element';
import { createCSSSheet, css } from '@mantou/gem/lib/utils';

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
  :host(:where([data-allow-drop], :state(allow-drop))) .content {
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
export class DuoyunDropAreaElement extends GemElement {
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

  constructor() {
    super();
    this.addEventListener('dragover', this.#onDragover);
    this.addEventListener('dragleave', this.#onDragleave);
    this.addEventListener('drop', this.#onDrop);
    this.internals.role = 'region';
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

  render = () => {
    return html`
      <slot></slot>
      <div role="tooltip" class="content">
        <div class="tip">${this.#tip}</div>
      </div>
    `;
  };
}
