import { camelToKebabCase } from '@mantou/gem/lib/utils';
import { isNotNullish } from 'duoyun-ui/lib/types';
import type { LanguageService } from 'typescript';
import type * as ts from 'typescript/lib/tsserverlibrary';

import { Decorators, DiagnosticCode, Utils } from './constants';
import type { Context } from './context';
import {
  bindMemberFunction,
  decorate,
  getAstNodeAtPosition,
  getCurrentElementDecl,
  getTagInfo,
  hasCallDecorator,
  hasDecorator,
  isClassMapKey,
} from './utils';

export function decorateLanguageService(ctx: Context, languageService: LanguageService) {
  const { ts, getProgram } = ctx;
  const ls = bindMemberFunction(languageService);

  languageService.getCompletionsAtPosition = (...args) => {
    const program = getProgram();
    const typeChecker = program.getTypeChecker();
    // 过滤 `state.|`，可以移动到更合适的位置
    decorate(typeChecker, () => decorateTypeChecker(typeChecker));

    const classKeys = getClassKeys(ctx, args[0], args[1]);
    if (classKeys) {
      return {
        isGlobalCompletion: true,
        isMemberCompletion: true,
        isNewIdentifierLocation: true,
        entries: classKeys.map((name) => ({ kind: ts.ScriptElementKind.enumMemberElement, sortText: '', name })),
      };
    }

    const themeKeys = getThemeKeys(ctx, args[0], args[1]);
    if (themeKeys) {
      return {
        isGlobalCompletion: true,
        isMemberCompletion: true,
        isNewIdentifierLocation: true,
        entries: themeKeys.map((name) => ({ kind: ts.ScriptElementKind.enumMemberElement, sortText: '', name })),
      };
    }

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

    ts.forEachChild(file, (node) => {
      const tag = ctx.getTagFromNode(node);
      if (tag && ts.isClassDeclaration(node)) {
        if (node.name && !node.name.text.endsWith('Element')) {
          result.push({
            file,
            start: node.name.getStart(),
            length: node.name.getEnd() - node.name.getStart(),
            category: ctx.config.strict ? ts.DiagnosticCategory.Warning : ts.DiagnosticCategory.Suggestion,
            code: DiagnosticCode.SuggestionClassName,
            messageText: 'Element definition class suggests the suffix to use `Element`',
          });
        }

        const isShadowDom = hasCallDecorator(ts, node, [Decorators.Shadow]);

        node.members.forEach((member) => {
          const memberStart = member.getStart();
          const baseMemberDiagnostic = { file, start: memberStart, length: member.getEnd() - memberStart };

          if (
            ctx.config.strict &&
            member.name &&
            ts.isIdentifier(member.name) &&
            member.name.text.length > 3 &&
            member.name.text === member.name.text.toLowerCase() &&
            member.name.text.startsWith('on')
          ) {
            result.push({
              ...baseMemberDiagnostic,
              category: ts.DiagnosticCategory.Warning,
              code: DiagnosticCode.SuggestionPropName,
              messageText: 'Consider changing the name, it looks too much like the html event handler',
            });
          }

          if (!ts.isPropertyDeclaration(member) || !member.modifiers) return;

          if (hasDecorator(ts, member, [Decorators.Prop]) && !member.questionToken && !member.initializer) {
            result.push({
              ...baseMemberDiagnostic,
              category: ctx.config.strict ? ts.DiagnosticCategory.Warning : ts.DiagnosticCategory.Suggestion,
              code: DiagnosticCode.SuggestionPropOptional,
              messageText: 'Custom element property should be optional',
            });
          }

          if (!hasDecorator(ts, member, [Decorators.Slot, Decorators.Part])) return;

          const missStaticKeyword = member.modifiers.every((e) => e.kind !== ts.SyntaxKind.StaticKeyword);
          if (missStaticKeyword || !isShadowDom) {
            result.push({
              ...baseMemberDiagnostic,
              category: ts.DiagnosticCategory.Warning,
              code: DiagnosticCode.DecoratorSyntaxError,
              messageText: missStaticKeyword
                ? 'Use static field for `@part` and `@slot`'
                : 'Not available on light dom `@part` and `@slot`',
            });
          }
        });
      }
    });

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
          .flatMap(({ classIdNodeMap, templateNode }) => {
            return classIdNodeMap.get(classMapKeyInfo.text)?.map((node) => ({
              kind,
              containerKind,
              fileName,
              containerName: '',
              name: '',
              textSpan: { start: node.offset + templateNode.pos + 1, length: node.getText().length },
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

    // https://github.com/mantou132/gem/issues/224
    // 需要支持类名重命名？
    // 需要收集 HTML/CSS 模板以及当前元素中 classMap key

    // @ts-expect-error
    const oResult = [...(ls.findRenameLocations(fileName, position, ...args) || [])];
    const file = ctx.getProgram().getSourceFile(fileName)!;
    const node = getAstNodeAtPosition(ts, file, position);

    const tag = node && ts.isPropertyDeclaration(node.parent) && ctx.getTagFromNode(node.parent.parent);
    if (!tag || !ts.isIdentifier(node)) return oResult;

    const propText = node.getText();
    const kebabCaseName = camelToKebabCase(propText);
    // FIXME: <my-element @camelCase=${console.log}>
    // FIXME: <my-element camelCase="5" ?camelCase>
    // 不能指定目标文本：https://github.com/microsoft/vscode/issues/248912
    // NOTE: 冒泡事件处理器无法找到
    if (isPropType(ts, node.parent, [Decorators.Emitter, Decorators.GlobalEmitter])) {
      getAllTagFromProp(ctx, node).forEach((tag) => {
        forEachAllHtmlTemplateNode(ctx, tag, (f, tagInfo) => {
          const info = tagInfo.node.attributesMap.get(`@${kebabCaseName}`);
          if (!info) return;
          const textSpan = { start: info.start + tagInfo.offset, length: info.end - info.start };
          oResult.push({ textSpan, fileName: f.fileName, prefixText: '@' });
        });
      });
    }
    // NOTE: CSS 中的属性选择器没有寻找，因为很难找全
    if (isPropType(ts, node.parent, [Decorators.Attr, Decorators.NumAttr, Decorators.BoolAttr, Decorators.Prop])) {
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
    node.parent.expression.getText() !== Decorators.CustomElement
  ) {
    return;
  }
  const tag = node.text;
  return { tag, textSpan: { start: node.getStart() + 1, length: tag.length } };
}

function getClassMapKeyInfo(ctx: Context, fileName: string, position: number) {
  const file = ctx.getProgram().getSourceFile(fileName)!;
  const node = getAstNodeAtPosition(ctx.ts, file, position);
  const decl = node && getCurrentElementDecl(ctx.ts, node);
  if (decl && isClassMapKey(ctx.ts, node)) {
    const isString = ctx.ts.isStringLiteral(node);
    return {
      text: node.text,
      styles: ctx.getAllCss(decl),
      textSpan: { start: node.getStart() + (isString ? 1 : 0), length: node.text.length },
    };
  }
}

export function isKey(typescript: typeof ts, node: ts.Node): node is ts.StringLiteral | ts.Identifier {
  if (!node.parent?.parent) return false;
  const assignment = node.parent;
  const obj = assignment.parent;
  const key = typescript.isStringLiteral(node) || typescript.isIdentifier(node);
  return (
    key &&
    ((typescript.isPropertyAssignment(assignment) && assignment.initializer !== node) ||
      typescript.isShorthandPropertyAssignment(assignment)) &&
    typescript.isObjectLiteralExpression(obj)
  );
}

function inReturn(typescript: typeof ts, node?: ts.Node) {
  if (!node?.parent?.parent) return false;
  const isReturnObject = (n: ts.Node) =>
    typescript.isObjectLiteralExpression(n) &&
    ((typescript.isParenthesizedExpression(n.parent) &&
      typescript.isArrowFunction(n.parent.parent) &&
      n.parent.parent.body === n.parent) ||
      typescript.isReturnStatement(n.parent));

  return (
    // 空对象
    isReturnObject(node) ||
    // 在返回对象的 key 上
    (isReturnObject(node.parent.parent) && isKey(typescript, node))
  );
}

function getThemeKeys(ctx: Context, fileName: string, position: number) {
  const program = ctx.getProgram();
  const typeChecker = program.getTypeChecker();
  const file = program.getSourceFile(fileName)!;
  const node = getAstNodeAtPosition(ctx.ts, file, position);
  if (!inReturn(ctx.ts, node)) return;
  let desc = node;
  while (desc) {
    if (
      ((ctx.ts.isArrowFunction(desc) || ctx.ts.isFunctionExpression(desc)) &&
        !ctx.ts.isPropertyDeclaration(desc.parent)) ||
      ctx.ts.isFunctionDeclaration(desc) ||
      ctx.ts.isClassDeclaration(desc) ||
      ctx.ts.isClassExpression(desc)
    ) {
      return;
    }
    if (ctx.ts.isPropertyDeclaration(desc) || ctx.ts.isMethodDeclaration(desc)) {
      for (const modifier of desc.modifiers || []) {
        if (!ctx.ts.isDecorator(modifier) || !ctx.ts.isCallExpression(modifier.expression)) continue;
        const themeDescSymbol = typeChecker.getSymbolAtLocation(modifier.expression.expression);
        const themeDesc = themeDescSymbol?.valueDeclaration;
        const param =
          themeDesc &&
          ctx.ts.isVariableDeclaration(themeDesc) &&
          themeDesc.initializer &&
          ctx.ts.isCallExpression(themeDesc.initializer) &&
          themeDesc.initializer.expression.getText() === Utils.CreateDecoratorTheme &&
          themeDesc.initializer.arguments.at(0);
        if (!param) continue;
        const type = typeChecker.getTypeAtLocation(param);
        return type.getApparentProperties().map((e) => e.name);
      }
      return;
    }
    desc = desc.parent;
  }
}

function isClassMap(typescript: typeof ts, node: ts.Node) {
  if (!node.parent?.parent) return false;
  const callExp = node.parent;
  const isEmptyClassMap =
    typescript.isObjectLiteralExpression(node) &&
    typescript.isCallExpression(callExp) &&
    typescript.isIdentifier(callExp.expression) &&
    callExp.expression.text === Utils.ClassMap;
  return isEmptyClassMap || isClassMapKey(typescript, node);
}

function getCurrentClassMap(typescript: typeof ts, node: ts.Node) {
  while (!typescript.isObjectLiteralExpression(node)) {
    node = node.parent;
    if (!node) return;
  }
  return node;
}

function getClassKeys(ctx: Context, fileName: string, position: number) {
  const file = ctx.getProgram().getSourceFile(fileName)!;
  const node = getAstNodeAtPosition(ctx.ts, file, position);
  const decl = node && getCurrentElementDecl(ctx.ts, node);
  if (decl && isClassMap(ctx.ts, node)) {
    const obj = getCurrentClassMap(ctx.ts, node)!;
    const keys = new Set(obj.properties.map((e) => e.name?.getText()));
    return ctx.getAllCss(decl).flatMap(({ classIdNodeMap }) => {
      return [...classIdNodeMap.entries()].filter(([k]) => !keys.has(k) && !k.startsWith('#')).map(([k]) => k);
    });
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

function decorateTypeChecker(typeChecker: ts.TypeChecker) {
  const neverType = typeChecker.getNeverType();
  // https://github.com/microsoft/TypeScript/blob/main/src/services/completions.ts#L3789
  // https://github.com/microsoft/TypeScript/blob/main/src/compiler/types.ts#L5217
  const internal = typeChecker as unknown as { isValidPropertyAccessForCompletions: (...a: any) => any };
  const checker = bindMemberFunction(internal, ['isValidPropertyAccessForCompletions']);
  internal.isValidPropertyAccessForCompletions = (...args: any[]) => {
    const result = checker.isValidPropertyAccessForCompletions(...args);
    try {
      return result && typeChecker.getTypeOfSymbol(args.at(2)) !== neverType;
    } catch {
      return result;
    }
  };
  return typeChecker;
}
