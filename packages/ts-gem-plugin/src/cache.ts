import type { TemplateContext } from 'typescript-template-language-service-decorator';
import type { Position } from 'vscode-languageserver-textdocument';
import { Cache } from 'duoyun-ui/lib/cache';

export class LRUCache<T extends object> {
  #bucket = new Cache<T>({ max: 100, renewal: true });

  #genKey(context: TemplateContext, position?: Position) {
    return [context.fileName, position?.line, position?.character, context.text].join(';');
  }

  getCached(context: TemplateContext, position?: Position) {
    return this.#bucket.get(this.#genKey(context, position));
  }

  updateCached(context: TemplateContext, posOrContent: Position | T, contentOrUndefined?: T) {
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
