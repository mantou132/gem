import { camelToKebabCase } from '@mantou/gem/lib/utils';
import { isNotNullish } from 'duoyun-ui/lib/types';
import type { LanguageService } from 'typescript';
import type * as ts from 'typescript/lib/tsserverlibrary';

import type { Context } from './context';
import {
  bindMemberFunction,
  decorate,
  getAllStyleNode,
  getAstNodeAtPosition,
  getCurrentElementDecl,
  getTagInfo,
  isClassMapKey,
} from './utils';

export function decorateLanguageService(ctx: Context, languageService: LanguageService) {
  const { ts, getProgram } = ctx;
  const ls = bindMemberFunction(languageService);

  // `state.|` filter
  languageService.getCompletionsAtPosition = (...args) => {
    const program = getProgram();
    const typeChecker = program.getTypeChecker();
    // 可以移动到更合适的位置
    decorate(typeChecker, () => decorateTypeChecker(ctx, typeChecker));
    return ls.getCompletionsAtPosition(...args);
  };

  languageService.getSyntacticDiagnostics = (...args) => {
    const program = getProgram();
    const file = program.getSourceFile(args[0])!;
    // 更新文档会触发 `getSuggestionDiagnostics`
    // 在 html 模版诊断之前更新
    ctx.updateElement(file);
    return ls.getSyntacticDiagnostics(...args);
  };

  // `memo/effect` decorate
  languageService.getSuggestionDiagnostics = (...args) => {
    const program = getProgram();
    const file = program.getSourceFile(args[0])!;
    const result = ls.getSuggestionDiagnostics(...args);

    return result.filter(({ start, reportsUnnecessary, category }) => {
      if (!reportsUnnecessary || category !== ts.DiagnosticCategory.Suggestion) return true;

      const node = getAstNodeAtPosition(ts, file, start);
      if (!node || !ts.isPrivateIdentifier(node)) return true;

      const declaration = (node as ts.PrivateIdentifier).parent;
      if (!ts.isMethodDeclaration(declaration) && !ts.isPropertyDeclaration(declaration)) return true;

      return !declaration.modifiers?.some((e) => e?.kind === ts.SyntaxKind.Decorator);
    });
  };

  languageService.findReferences = (...args) => {
    const map = new Map<string, ts.ReferencedSymbol>();
    const tagDefinedInfo = findDefinedTagInfo(ctx, ...args);
    if (tagDefinedInfo) {
      forEachAllHtmlTemplateNode(ctx, tagDefinedInfo.tag, (file, tagInfo) => {
        const symbol = map.get(file.fileName) || getReferencedSymbol(ctx, file);
        map.set(file.fileName, symbol);
        symbol.references.push({
          fileName: file.fileName,
          isWriteAccess: true,
          textSpan: tagInfo.open,
        });
      });
      forEachAllCssTemplateNode(ctx, tagDefinedInfo.tag, (file, textSpan) => {
        const symbol = map.get(file.fileName) || getReferencedSymbol(ctx, file);
        map.set(file.fileName, symbol);
        symbol.references.push({
          fileName: file.fileName,
          isWriteAccess: true,
          textSpan,
        });
      });
      return [...map.values()];
    }
    const oResult = ls.findReferences(...args) || [];
    const program = getProgram();
    const currentNode = getAstNodeAtPosition(ts, program.getSourceFile(args[0])!, args[1]);
    if (!currentNode || !ts.isIdentifier(currentNode)) return oResult;

    const currentTag = ctx.getTagFromNode(currentNode.parent) || ctx.getTagFromNode(currentNode.parent.parent);
    const prop = ts.isClassDeclaration(currentNode.parent.parent) && currentNode;
    if (!currentTag) return oResult;

    if (prop) {
      getAllTagFromProp(ctx, currentNode).forEach((tag) => {
        forEachAllHtmlTemplateNode(ctx, tag, (file, tagInfo) => {
          const symbol = map.get(file.fileName) || getReferencedSymbol(ctx, file);
          map.set(file.fileName, symbol);
          const propNames = new Set([`.${prop.text}`]);
          const kebabCaseName = camelToKebabCase(prop.text);
          ['', '?', '@'].forEach((c) => propNames.add(`${c}${kebabCaseName}`));
          for (const propName of propNames) {
            const info = tagInfo.node.attributesMap.get(propName);
            if (!info) continue;
            const textSpan = { start: info.start + tagInfo.offset, length: info.end - info.start };
            symbol.references.push({ fileName: file.fileName, isWriteAccess: true, textSpan });
          }
        });
      });
    }
    return [...map.values(), ...oResult];
  };

  languageService.getDefinitionAndBoundSpan = (...args) => {
    const classMapKeyInfo = getClassMapKeyInfo(ctx, ...args);
    const kind = ts.ScriptElementKind.classElement;
    const containerKind = ts.ScriptElementKind.unknown;
    const fileName = args[0];
    if (classMapKeyInfo) {
      return {
        textSpan: classMapKeyInfo.textSpan,
        definitions: classMapKeyInfo.styles
          .flatMap((e) => {
            const { fileName } = e.getSourceFile();
            const templateContext = ctx.cssSourceHelper.getTemplate(fileName, e.pos + 1);
            if (!templateContext) return;
            const { classIdNodeMap } = ctx.getCssDoc(templateContext.text);
            return classIdNodeMap.get(classMapKeyInfo.text)?.map((node) => ({
              kind,
              containerKind,
              fileName,
              containerName: '',
              name: '',
              textSpan: { start: node.offset + e.pos + 1, length: node.getText().length },
            }));
          })
          .filter(isNotNullish),
      };
    }
    const tagDefinedInfo = findDefinedTagInfo(ctx, ...args);
    if (!tagDefinedInfo) return ls.getDefinitionAndBoundSpan(...args);
    // 触发 go to ref: https://github.com/microsoft/vscode/issues/250280
    const textSpan = tagDefinedInfo.textSpan;
    return {
      textSpan,
      definitions: [{ kind, containerKind, fileName, containerName: '', name: '', textSpan }],
    };
  };

  languageService.getRenameInfo = (fileName, position, ...args) => {
    const tagInfo = findCurrentTagInfo(ctx, fileName, position);
    if (tagInfo) {
      return {
        canRename: true,
        displayName: tagInfo.tag,
        fullDisplayName: tagInfo.tag,
        kind: ts.ScriptElementKind.alias,
        kindModifiers: 'tag',
        triggerSpan: tagInfo.open,
      };
    }
    const tagDefinedInfo = findDefinedTagInfo(ctx, fileName, position);
    if (tagDefinedInfo) {
      return {
        canRename: true,
        displayName: tagDefinedInfo.tag,
        fullDisplayName: tagDefinedInfo.tag,
        kind: ts.ScriptElementKind.alias,
        kindModifiers: 'tag',
        triggerSpan: tagDefinedInfo.textSpan,
      };
    }
    return ls.getRenameInfo(fileName, position, ...args);
  };

  languageService.findRenameLocations = (fileName, position, ...args) => {
    const tagPairInfo = findCurrentTagInfo(ctx, fileName, position);
    if (tagPairInfo) {
      const result: ts.RenameLocation[] = [{ fileName, textSpan: tagPairInfo.open }];
      if (tagPairInfo.end) result.push({ fileName, textSpan: tagPairInfo.end });
      return result;
    }
    const tagDefinedInfo = findDefinedTagInfo(ctx, fileName, position);
    if (tagDefinedInfo) {
      const result: ts.RenameLocation[] = [{ fileName, textSpan: tagDefinedInfo.textSpan }];
      forEachAllHtmlTemplateNode(ctx, tagDefinedInfo.tag, (f, info) => {
        result.push({ fileName: f.fileName, textSpan: info.open });
        if (info.end) result.push({ fileName: f.fileName, textSpan: info.end });
      });
      forEachAllCssTemplateNode(ctx, tagDefinedInfo.tag, (f, textSpan) => {
        result.push({ fileName: f.fileName, textSpan });
      });
      return result;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const oResult = [...(ls.findRenameLocations(fileName, position, ...args) || [])];
    const file = ctx.getProgram().getSourceFile(fileName)!;
    const node = getAstNodeAtPosition(ctx.ts, file, position);

    const tag = node && ts.isPropertyDeclaration(node.parent) && ctx.getTagFromNode(node.parent.parent);
    if (!tag || !ts.isIdentifier(node)) return oResult;

    const propText = node.getText();
    const kebabCaseName = camelToKebabCase(propText);
    // FIXME: <my-element @camelCase=${console.log}>
    // FIXME: <my-element camelCase="5" ?camelCase>
    // 不能指定目标文本：https://github.com/microsoft/vscode/issues/248912
    // NOTE: 冒泡事件处理器无法找到
    if (isPropType(ctx.ts, node.parent, ['emitter', 'globalemitter'])) {
      getAllTagFromProp(ctx, node).forEach((tag) => {
        forEachAllHtmlTemplateNode(ctx, tag, (f, tagInfo) => {
          const info = tagInfo.node.attributesMap.get(`@${kebabCaseName}`);
          if (!info) return;
          const textSpan = { start: info.start + tagInfo.offset, length: info.end - info.start };
          oResult.push({ textSpan, fileName: f.fileName, prefixText: '@' });
        });
      });
    }
    if (isPropType(ctx.ts, node.parent, ['attribute', 'numattribute', 'boolattribute', 'property'])) {
      getAllTagFromProp(ctx, node).forEach((tag) => {
        forEachAllHtmlTemplateNode(ctx, tag, (f, tagInfo) => {
          const propNames = [
            ['', kebabCaseName],
            ['?', kebabCaseName],
            ['.', propText],
          ];
          propNames.map(([decorate, propName]) => {
            const info = tagInfo.node.attributesMap.get(decorate + propName);
            if (!info) return;
            const textSpan = { start: info.start + tagInfo.offset, length: info.end - info.start };
            oResult.push({ textSpan, fileName: f.fileName, prefixText: decorate });
          });
        });
      });
    }

    return oResult;
  };

  return languageService;
}

function getAllTagFromProp(ctx: Context, prop: ts.Identifier) {
  let originTagDecl: ts.Node = prop;
  while (!ctx.ts.isClassDeclaration(originTagDecl)) {
    originTagDecl = originTagDecl.parent;
  }
  const typeChecker = ctx.getProgram().getTypeChecker();
  const originTagType = typeChecker.getTypeAtLocation(originTagDecl);
  const result: string[] = [];
  [...ctx.elements].forEach(([tag, decl]) => {
    const tagType = typeChecker.getTypeAtLocation(decl);
    if (!tagType.isClassOrInterface()) return;
    if (typeChecker.isTypeAssignableTo(tagType, originTagType)) {
      result.push(tag);
    }
  });
  return result;
}

function getReferencedSymbol(ctx: Context, file: ts.SourceFile): ts.ReferencedSymbol {
  return {
    references: [],
    definition: {
      containerKind: ctx.ts.ScriptElementKind.unknown,
      containerName: '',
      displayParts: [],
      fileName: file.fileName,
      textSpan: { start: 0, length: 0 },
      name: 'test',
      kind: ctx.ts.ScriptElementKind.unknown,
    },
  };
}

function forEachAllHtmlTemplateNode(
  ctx: Context,
  tag: string,
  fn: (file: ts.SourceFile, info: ReturnType<typeof getTagInfo>) => void,
) {
  for (const file of ctx.getProgram().getSourceFiles()) {
    if (file.fileName.endsWith('.d.ts')) continue;
    for (const templateContext of ctx.htmlSourceHelper.getAllTemplates(file.fileName)) {
      const { tagNodeMap } = ctx.getHtmlDoc(templateContext.text);
      tagNodeMap.get(tag)?.forEach((node) => fn(file, getTagInfo(node, templateContext.node.getStart() + 1)));
    }
  }
}

function forEachAllCssTemplateNode(
  ctx: Context,
  tag: string,
  fn: (file: ts.SourceFile, textSpan: ts.TextSpan) => void,
) {
  for (const file of ctx.getProgram().getSourceFiles()) {
    if (file.fileName.endsWith('.d.ts')) continue;
    for (const templateContext of ctx.cssSourceHelper.getAllTemplates(file.fileName)) {
      const { tagNodeMap } = ctx.getCssDoc(templateContext.text);
      const offset = templateContext.node.getStart() + 1;
      tagNodeMap.get(tag)?.forEach((node) => fn(file, { start: offset + node.offset, length: node.end - node.offset }));
    }
  }
}

function findCurrentTagInfo(ctx: Context, fileName: string, position: number) {
  const templateContext = ctx.htmlSourceHelper.getTemplate(fileName, position);
  if (!templateContext) return;
  const htmlOffset = templateContext.node.pos + 1;
  const { vHtml } = ctx.getHtmlDoc(templateContext.text);
  const relativePosition = ctx.htmlSourceHelper.getRelativePosition(templateContext, position);
  const offset = templateContext.toOffset(relativePosition);
  const node = vHtml.findNodeAt(offset);
  if (node.tag && offset < node.start + 1 + node.tag.length) return getTagInfo(node, htmlOffset);
}

function findDefinedTagInfo(ctx: Context, fileName: string, position: number) {
  const file = ctx.getProgram().getSourceFile(fileName)!;
  const node = getAstNodeAtPosition(ctx.ts, file, position);
  if (
    !node ||
    !ctx.ts.isStringLiteral(node) ||
    !ctx.ts.isCallExpression(node.parent) ||
    node.parent.expression.getText() !== 'customElement'
  ) {
    return;
  }
  const tag = node.text;
  return { tag, textSpan: { start: node.getStart() + 1, length: tag.length } };
}

function getClassMapKeyInfo(ctx: Context, fileName: string, position: number) {
  const program = ctx.getProgram();
  const file = program.getSourceFile(fileName)!;
  const typeChecker = program.getTypeChecker();
  const node = getAstNodeAtPosition(ctx.ts, file, position);
  const decl = node && getCurrentElementDecl(ctx.ts, node);
  if (decl && isClassMapKey(ctx.ts, node)) {
    const isString = ctx.ts.isStringLiteral(node);
    return {
      text: node.text,
      styles: getAllStyleNode(ctx.ts, typeChecker, decl),
      textSpan: { start: node.getStart() + (isString ? 1 : 0), length: node.text.length },
    };
  }
}

function isPropType(typescript: typeof ts, node: ts.Node, types: string[]) {
  if (!typescript.isPropertyDeclaration(node)) return;
  for (const modifier of node.modifiers || []) {
    if (!typescript.isDecorator(modifier)) continue;
    const { expression } = modifier;
    if (typescript.isIdentifier(expression) && types.includes(expression.text)) {
      return true;
    }
  }
}

function decorateTypeChecker(ctx: Context, typeChecker: ts.TypeChecker) {
  // https://github.com/microsoft/TypeScript/blob/main/src/services/completions.ts#L3789
  // https://github.com/microsoft/TypeScript/blob/main/src/compiler/types.ts#L5217
  const internal = typeChecker as unknown as { isValidPropertyAccessForCompletions: (...a: any) => any };
  const checker = bindMemberFunction(internal, ['isValidPropertyAccessForCompletions']);
  internal.isValidPropertyAccessForCompletions = (...args: any[]) => {
    const result = checker.isValidPropertyAccessForCompletions(...args);
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
