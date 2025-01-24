import type { TemplateContext } from '@mantou/typescript-template-language-service-decorator';
import type { Position } from 'vscode-languageserver-textdocument';
import { Cache } from 'duoyun-ui/lib/cache';

export type CacheContext = Pick<TemplateContext, 'fileName' | 'text'>;

export class LRUCache<T extends object> {
  #bucket: Cache<T>;
  constructor(args?: ConstructorParameters<typeof Cache<T>>[0]) {
    this.#bucket = new Cache<T>({ max: 25, renewal: true, ...args });
  }

  #genKey(context: CacheContext, position?: Position) {
    return [context.fileName, position?.line, position?.character, context.text].join(';');
  }

  get(context: CacheContext, position: Position | undefined, init: () => T) {
    return this.#bucket.get(this.#genKey(context, position), init);
  }
}
