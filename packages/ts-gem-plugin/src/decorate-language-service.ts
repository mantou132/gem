import type * as ts from 'typescript/lib/tsserverlibrary';
import type { LanguageService } from 'typescript';
import type { Logger } from 'typescript-template-language-service-decorator';

import { decorate, type Utils } from './utils';

export type Context = {
  ts: typeof ts;
  utils: Utils;
  logger: Logger;
  getProgram: LanguageService['getProgram'];
  getProject: () => ts.server.Project;
};

export function decorateLanguageService(languageService: LanguageService, { ts, utils, getProgram }: Context) {
  const decorateTypeChecker = (typeChecker: ts.TypeChecker) => {
    const fn = (typeChecker as any).isValidPropertyAccessForCompletions.bind(typeChecker);

    // https://github.com/microsoft/TypeScript/blob/main/src/services/completions.ts#L3789
    // https://github.com/microsoft/TypeScript/blob/main/src/compiler/types.ts#L5217
    (typeChecker as any).isValidPropertyAccessForCompletions = (...args: any[]) => {
      const result = fn(...args);
      try {
        const { declarations } = args.at(2) as ts.Symbol;
        return (
          result &&
          (!declarations ||
            declarations.some((node) => ts.isPropertySignature(node) && node.type?.getText() !== 'never'))
        );
      } catch {
        return result;
      }
    };
    return typeChecker;
  };

  const ls = Object.fromEntries(
    Object.entries(languageService).map(([key, value]) => [key, value.bind(languageService)]),
  ) as LanguageService;

  languageService.getCompletionsAtPosition = (...args) => {
    const typeChecker = getProgram()!.getTypeChecker();
    decorate(typeChecker, decorateTypeChecker);
    return ls.getCompletionsAtPosition(...args);
  };

  languageService.getSuggestionDiagnostics = (...args) => {
    const file = getProgram()!.getSourceFile(args[0])!;
    const result = ls.getSuggestionDiagnostics(...args);

    return result.filter(({ start, reportsUnnecessary, category }) => {
      if (!reportsUnnecessary || category !== ts.DiagnosticCategory.Suggestion) return true;

      const node = utils.getAstNodeAtPosition(file, start);
      if (!node || !ts.isPrivateIdentifier(node)) return true;

      const declaration = (node as ts.PrivateIdentifier).parent;
      if (!ts.isMethodDeclaration(declaration) && !ts.isPropertyDeclaration(declaration)) return true;

      return !declaration.modifiers?.some((e) => e?.kind === ts.SyntaxKind.Decorator);
    });
  };

  return languageService;
}
