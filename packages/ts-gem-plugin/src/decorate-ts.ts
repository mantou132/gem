import type { LanguageService } from 'typescript';
import type * as ts from 'typescript/lib/tsserverlibrary';
import type { Node } from '@mantou/vscode-html-languageservice';
import { camelToKebabCase } from '@mantou/gem/lib/utils';

import type { Context } from './context';
import { bindMemberFunction, decorate, forEachNode, getHTMLTextAtPosition } from './utils';

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
          const { attributes = {}, start, startTagEnd } = tagInfo.node;
          if (!(propName in attributes)) continue;
          const attrStart = file.getFullText().slice(start + tagInfo.offset, startTagEnd! + tagInfo.offset);
          const index = attrStart.split(propName)[0].length;
          symbol.references.push({
            fileName: file.fileName,
            isWriteAccess: true,
            textSpan: { start: start + tagInfo.offset + index, length: propName.length },
          });
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
    const tagInfo = findCurrentTagInfo(ctx, fileName, position);
    if (tagInfo) {
      const result: ts.RenameLocation[] = [{ fileName, textSpan: tagInfo.open }];
      if (tagInfo.end) result.push({ fileName, textSpan: tagInfo.end });
      return result;
    }
    const tagDefinedInfo = findDefinedTagInfo(ctx, fileName, position);
    if (tagDefinedInfo) {
      const result: ts.RenameLocation[] = [{ fileName, textSpan: tagDefinedInfo.textSpan }];
      forEachAllHtmlTemplateNode(ctx, tagDefinedInfo.tag, (f, info) => {
        result.push({ fileName: f.fileName, textSpan: info.open });
        if (info.end) result.push({ fileName: f.fileName, textSpan: info.end });
      });
      return result;
    }
    // TODO: prop rename
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return ls.findRenameLocations(fileName, position, ...args);
  };

  return languageService;
}

function getAstNodeAtPosition(typescript: typeof ts, node: ts.Node, pos: number) {
  if (node.pos > pos || node.end <= pos) return;
  while (node.kind >= typescript.SyntaxKind.FirstNode) {
    const nested = typescript.forEachChild(node, (child) => (child.pos <= pos && child.end > pos ? child : undefined));
    if (nested === undefined) break;
    node = nested;
  }
  return node;
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

function getTagInfo(node: Node, offset: number) {
  const tag = node.tag!;
  const openStart = node.start + 1 + offset;
  return {
    node,
    tag,
    offset,
    open: { start: openStart, length: tag.length },
    end: node.endTagStart && {
      start: node.endTagStart! + 2 + offset,
      length: node.end - node.endTagStart! - 3,
    },
  };
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
