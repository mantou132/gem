import type * as ts from 'typescript/lib/tsserverlibrary';
import type { LanguageService } from 'typescript';
import type { Logger } from 'typescript-template-language-service-decorator';

export type Context = {
  ts: typeof ts;
  logger: Logger;
  getProgram: LanguageService['getProgram'];
  getProject: () => ts.server.Project;
};

export function decorateLanguageService(languageService: LanguageService, { logger, ts, getProgram }: Context) {
  const ls = Object.fromEntries(
    Object.entries(languageService).map(([key, value]) => [key, value.bind(languageService)]),
  ) as LanguageService;

  languageService.getCompletionsAtPosition = (...args) => {
    const result = ls.getCompletionsAtPosition(...args);

    if (!result?.entries.find((entry) => entry.name === '~updater~')) return result;

    const _file = getProgram()!.getSourceFile(args[0])!;

    return {
      ...result,
      entries: result?.entries
        .filter((e) => e.kind !== ts.ScriptElementKind.variableElement)
        // TODO: 过滤掉 never 类型的项目
        .filter((e) => e.name !== '~updater~'),
    };
  };

  languageService.getSuggestionDiagnostics = (...args) => {
    const result = ls.getSuggestionDiagnostics(...args);

    const _file = getProgram()!.getSourceFile(args[0])!;

    logger.log(JSON.stringify(result.filter((e) => e.reportsUnnecessary).map((e) => ({ ...e, file: 'omit' }))));
    return result.filter(
      (e) =>
        !e.reportsUnnecessary ||
        e.category !== ts.DiagnosticCategory.Suggestion ||
        // TODO: 过滤有装饰器的项目
        typeof e.messageText !== 'string' ||
        !e.messageText.startsWith("'#"),
    );
  };

  return languageService;
}
