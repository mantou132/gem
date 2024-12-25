import type * as ts from 'typescript/lib/tsserverlibrary';
import type { TemplateLanguageService, TemplateContext, Logger } from 'typescript-template-language-service-decorator';

import type { Context } from './decorate-language-service';

export class EchoTemplateLanguageService implements TemplateLanguageService {
  #logger: Logger;

  constructor(ctx: Context) {
    this.#logger = ctx.logger;
  }

  getCompletionsAtPosition(context: TemplateContext, _position: ts.LineAndCharacter): ts.CompletionInfo {
    // TODO: html tree-sitter parse

    this.#logger.log(context.text);

    return {
      isGlobalCompletion: false,
      isMemberCompletion: false,
      isNewIdentifierLocation: false,
      entries: [],
    };
  }
}
