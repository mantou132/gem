import type * as ts from 'typescript/lib/tsserverlibrary';
import type { LanguageService } from 'typescript';

import { decorate, forEachTag, getAstNodeAtPosition, getCustomElementTag, isDepElement } from './utils';
import type { Context } from './configuration';

function decorateTypeChecker(ctx: Context, typeChecker: ts.TypeChecker) {
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
        (node) => ctx.ts.isPropertySignature(node) && node.type?.getText() === 'never',
      );
      return !isNever;
    } catch {
      return true;
    }
  };
  return typeChecker;
}

function updateElement(ctx: Context, file: ts.SourceFile) {
  const isDep = isDepElement(file);
  // 只支持顶级 class 声明
  ctx.ts.forEachChild(file, (node) => {
    const tag = getCustomElementTag(ctx.ts, node, isDep);
    if (tag && ctx.ts.isClassDeclaration(node)) {
      ctx.elements.set(tag, node);
    }
  });
}

export function decorateLanguageService(ctx: Context, languageService: LanguageService) {
  const { ts, getProgram } = ctx;
  const ls = Object.fromEntries(
    Object.entries(languageService).map(([key, value]) => [key, value.bind(languageService)]),
  ) as LanguageService;

  languageService.getCompletionsAtPosition = (...args) => {
    const program = getProgram()!;
    const typeChecker = program.getTypeChecker();
    // 可以移动到更合适的位置
    decorate(typeChecker, () => decorateTypeChecker(ctx, typeChecker));
    return ls.getCompletionsAtPosition(...args);
  };

  languageService.findReferences = (...args) => {
    const program = getProgram()!;
    const result: ReturnType<typeof ls.findReferences> = [];
    const currentNode = getAstNodeAtPosition(ts, program.getSourceFile(args[0])!, args[1]);
    const currentTag = currentNode && getCustomElementTag(ts, currentNode.parent);
    for (const file of program.getSourceFiles()) {
      const references: ts.ReferencedSymbolEntry[] = [];
      forEachTag(ts, file, ({ tag, length, start }) => {
        if (tag !== currentTag) return;
        references.push({
          fileName: file.fileName,
          isWriteAccess: true,
          textSpan: { start, length },
        });
      });

      if (!references.length) continue;
      result.push({
        references,
        definition: {
          containerKind: ctx.ts.ScriptElementKind.unknown,
          containerName: '',
          displayParts: [],
          fileName: file.fileName,
          textSpan: { start: 0, length: 0 },
          name: 'test',
          kind: ctx.ts.ScriptElementKind.unknown,
        },
      });
    }
    return [...result, ...(ls.findReferences(...args) || [])];
  };

  languageService.getSuggestionDiagnostics = (...args) => {
    const program = getProgram()!;

    // 可以移动到更合适的位置，这里仅仅用来收集自定义元素
    decorate(program, () => {
      program.getSourceFiles().forEach((file) => updateElement(ctx, file));
      return program;
    });

    const file = program.getSourceFile(args[0])!;
    const result = ls.getSuggestionDiagnostics(...args);

    // 更新文档会触发 `getSuggestionDiagnostics`
    updateElement(ctx, file);

    return result.filter(({ start, reportsUnnecessary, category }) => {
      if (!reportsUnnecessary || category !== ts.DiagnosticCategory.Suggestion) return true;

      const node = getAstNodeAtPosition(ts, file, start);
      if (!node || !ts.isPrivateIdentifier(node)) return true;

      const declaration = (node as ts.PrivateIdentifier).parent;
      if (!ts.isMethodDeclaration(declaration) && !ts.isPropertyDeclaration(declaration)) return true;

      return !declaration.modifiers?.some((e) => e?.kind === ts.SyntaxKind.Decorator);
    });
  };

  return languageService;
}
