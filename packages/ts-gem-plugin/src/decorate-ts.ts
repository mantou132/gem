import type * as ts from 'typescript/lib/tsserverlibrary';
import type { LanguageService } from 'typescript';
import type { Logger } from 'typescript-template-language-service-decorator';

import { decorate, type Utils } from './utils';
import type { Configuration } from './configuration';

export type Context = {
  config: Configuration;
  ts: typeof ts;
  utils: Utils;
  logger: Logger;
  getProgram: LanguageService['getProgram'];
  getProject: () => ts.server.Project;
};

function decorateTypeChecker(typeChecker: ts.TypeChecker, context: Context) {
  const fn = (typeChecker as any).isValidPropertyAccessForCompletions.bind(typeChecker);

  // https://github.com/microsoft/TypeScript/blob/main/src/services/completions.ts#L3789
  // https://github.com/microsoft/TypeScript/blob/main/src/compiler/types.ts#L5217
  (typeChecker as any).isValidPropertyAccessForCompletions = (...args: any[]) => {
    const result = fn(...args);
    if (!result) return false;
    try {
      const { declarations } = args.at(2) as ts.Symbol;
      if (!declarations) return true;
      const isNever = declarations.every(
        (node) => context.ts.isPropertySignature(node) && node.type?.getText() === 'never',
      );
      return !isNever;
    } catch {
      return true;
    }
  };
  return typeChecker;
}

export function decorateLanguageService(languageService: LanguageService, ctx: Context) {
  const { ts, utils, getProgram } = ctx;
  const ls = Object.fromEntries(
    Object.entries(languageService).map(([key, value]) => [key, value.bind(languageService)]),
  ) as LanguageService;

  languageService.getCompletionsAtPosition = (...args) => {
    const typeChecker = getProgram()!.getTypeChecker();
    decorate(typeChecker, () => decorateTypeChecker(typeChecker, ctx));
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
