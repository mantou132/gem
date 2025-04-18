import { camelToKebabCase } from '@mantou/gem/lib/utils';
import type { LanguageService } from 'typescript';
import type * as ts from 'typescript/lib/tsserverlibrary';

import type { Context } from './context';
import {
  bindMemberFunction,
  decorate,
  forEachNode,
  getAstNodeAtPosition,
  getHTMLTextAtPosition,
  getTagInfo,
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

  // `memo/effect` decorate
  languageService.getSuggestionDiagnostics = (...args) => {
    const program = getProgram();
    const file = program.getSourceFile(args[0])!;
    const result = ls.getSuggestionDiagnostics(...args);

    // 更新文档会触发 `getSuggestionDiagnostics`
    ctx.updateElement(file);

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
    const oResult = ls.findReferences(...args) || [];
    const program = getProgram();
    const currentNode = getAstNodeAtPosition(ts, program.getSourceFile(args[0])!, args[1]);
    if (!currentNode) return oResult;
    const isIdent = ts.isIdentifier(currentNode);
    if (!isIdent) return oResult;
    const currentTag = ctx.getTagFromNode(currentNode.parent) || ctx.getTagFromNode(currentNode.parent.parent);
    const prop = ts.isClassDeclaration(currentNode.parent.parent) && currentNode;
    if (!currentTag) return oResult;
    const map = new Map<string, ts.ReferencedSymbol>();
    // 只遍历了 html 模板中的元素使用，未遍历 css/style 中的节点
    forEachAllHtmlTemplateNode(ctx, currentTag, (file, tagInfo) => {
      const symbol = map.get(file.fileName) || {
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
      map.set(file.fileName, symbol);
      if (prop) {
        const propNames = new Set([`.${prop.text}`]);
        const kebabCaseName = camelToKebabCase(prop.text);
        ['', '?', '@'].forEach((c) => propNames.add(`${c}${kebabCaseName}`));
        for (const propName of propNames) {
          const info = tagInfo.node.attributesMap.get(propName);
          if (!info) continue;
          const textSpan = { start: info.start + tagInfo.offset, length: info.end - info.start };
          symbol.references.push({ fileName: file.fileName, isWriteAccess: true, textSpan });
        }
      } else {
        symbol.references.push({
          fileName: file.fileName,
          isWriteAccess: true,
          textSpan: tagInfo.open,
        });
      }
    });
    return [...map.values(), ...oResult];
  };

  languageService.getRenameInfo = (fileName, position, ...args) => {
    const result = ls.getRenameInfo(fileName, position, ...args);
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
    return result;
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
      // 只遍历了 html 模板中的元素使用，未遍历 css/style 中的节点
      forEachAllHtmlTemplateNode(ctx, tagDefinedInfo.tag, (f, info) => {
        result.push({ fileName: f.fileName, textSpan: info.open });
        if (info.end) result.push({ fileName: f.fileName, textSpan: info.end });
      });
      return result;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const oResult = [...(ls.findRenameLocations(fileName, position, ...args) || [])];
    const file = ctx.getProgram().getSourceFile(fileName)!;
    const node = getAstNodeAtPosition(ctx.ts, file, position);

    const tag = node && ts.isPropertyDeclaration(node.parent) && ctx.getTagFromNode(node.parent.parent);
    if (!tag) return oResult;

    const propText = node.getText();
    const kebabCaseName = camelToKebabCase(propText);
    // FIXME: `@camelCase`
    if (isPropType(ctx.ts, node.parent, ['emitter', 'globalemitter'])) {
      forEachAllHtmlTemplateNode(ctx, tag, (f, tagInfo) => {
        const info = tagInfo.node.attributesMap.get(`@${kebabCaseName}`);
        if (!info) return;
        const textSpan = { start: info.start + tagInfo.offset, length: info.end - info.start };
        oResult.push({ fileName: f.fileName, prefixText: '@', textSpan });
      });
    }
    // FIXME: <my-element .camelCase="5" .camelCase>
    if (isPropType(ctx.ts, node.parent, ['attribute', 'numattribute', 'boolattribute', 'property'])) {
      forEachAllHtmlTemplateNode(ctx, tag, (f, tagInfo) => {
        const propNames = ['', '.', '?'].map((c) => `${c}${kebabCaseName}`);
        propNames.map((propName) => {
          const info = tagInfo.node.attributesMap.get(propName);
          if (!info) return;
          const textSpan = { start: info.start + tagInfo.offset, length: info.end - info.start };
          oResult.push({ fileName: f.fileName, prefixText: '.', textSpan });
        });
      });
    }

    return oResult;
  };

  return languageService;
}

function forEachAllHtmlTemplateNode(
  ctx: Context,
  tag: string,
  fn: (fileName: ts.SourceFile, info: ReturnType<typeof getTagInfo>) => void,
) {
  for (const file of ctx.getProgram().getSourceFiles()) {
    if (file.fileName.endsWith('.d.ts')) continue;
    for (const templateContext of ctx.htmlSourceHelper.getAllTemplates(file.fileName)) {
      const { vHtml } = ctx.getHtmlDoc(templateContext.text);
      forEachNode(vHtml.roots, (node) => {
        if (node.tag !== tag) return;
        fn(file, getTagInfo(node, templateContext.node.getStart() + 1));
      });
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
  const { text } = getHTMLTextAtPosition(templateContext.text, offset);
  const onTag = offset < node.startTagEnd! && text === node.tag;
  if (!onTag || !node.tag) return;
  return getTagInfo(node, htmlOffset);
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
