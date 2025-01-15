import type { TemplateContext } from '@mantou/typescript-template-language-service-decorator';
import type { Position } from 'vscode-languageserver-textdocument';
import { Cache } from 'duoyun-ui/lib/cache';

export type CacheContext = Pick<TemplateContext, 'fileName' | 'text'>;

export class LRUCache<T extends object> {
  #bucket = new Cache<T>({ max: 25, renewal: true });

  #genKey(context: CacheContext, position?: Position) {
    return [context.fileName, position?.line, position?.character, context.text].join(';');
  }

  get(context: CacheContext, init: () => T) {
    return this.#bucket.get(this.#genKey(context), init);
  }

  getCached(context: CacheContext, position?: Position) {
    return this.#bucket.get(this.#genKey(context, position));
  }

  updateCached(context: CacheContext, posOrContent: Position | T, contentOrUndefined?: T) {
    let position: Position | undefined;
    let content: T;
    if ('line' in posOrContent && 'character' in posOrContent) {
      position = posOrContent;
      content = contentOrUndefined!;
    } else {
      position = undefined;
      content = posOrContent;
    }
    return this.#bucket.set(this.#genKey(context, position), content);
  }
}
