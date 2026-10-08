import type { ClassDeclaration, Node, PropertyDeclaration, SourceFile } from 'typescript/unstable/ast';
import {
  getTokenAtPosition,
  isCallExpression,
  isClassDeclaration,
  isDecorator,
  isIdentifier,
  isPropertyDeclaration,
  isStringLiteral,
  isTaggedTemplateExpression,
} from 'typescript/unstable/ast';
import type { API, Project } from 'typescript/unstable/async';
import type { Hover, HoverParams, Position } from 'typescript/unstable/vscode';

// 宿主无关：VS Code 中间件、LSP 代理都调用同一份变换
export type Transformer<P, R> = (result: R, context: { readonly params: P }) => Promise<R>;

export interface GemMiddleware {
  'textDocument/hover': Transformer<HoverParams, Hover | null>;
}

const HTML_TAGS = new Set(['html', 'raw', 'h']);
const PROP_DECORATORS = new Set(['attribute', 'numattribute', 'boolattribute', 'property']);

function toOffset(text: string, { line, character }: Position) {
  let offset = 0;
  for (let i = 0; i < line; i++) offset = text.indexOf('\n', offset) + 1;
  return offset + character;
}

function findAncestor<T extends Node>(node: Node | undefined, test: (node: Node) => node is T) {
  for (let n = node; n; n = n.parent) if (test(n)) return n;
}

function getDecoratorCall(node: Node, names: Set<string>) {
  const modifiers = (node as ClassDeclaration).modifiers ?? [];
  for (const modifier of modifiers) {
    if (!isDecorator(modifier)) continue;
    const expr = modifier.expression;
    const callee = isCallExpression(expr) ? expr.expression : expr;
    if (isIdentifier(callee) && names.has(callee.text)) return { name: callee.text, expr };
  }
}

function getTagName(node: ClassDeclaration) {
  const call = getDecoratorCall(node, new Set(['customElement']));
  const arg = call && isCallExpression(call.expr) ? call.expr.arguments[0] : undefined;
  return arg && isStringLiteral(arg) ? arg.text : undefined;
}

function getCustomTagAt(text: string, offset: number) {
  const start = text.lastIndexOf('<', offset);
  const match = start === -1 ? null : text.slice(start).match(/^<\/?([a-z][\w]*-[\w-]*)/);
  if (!match || offset > start + match[0].length) return;
  return match[1];
}

async function findElement(project: Project, tag: string) {
  const fileNames = await project.program.getSourceFileNames();
  for (const fileName of fileNames) {
    if (fileName.includes('/node_modules/') || fileName.endsWith('.d.ts')) continue;
    const file = await project.program.getSourceFile(fileName);
    const node = file?.statements.find((s): s is ClassDeclaration => isClassDeclaration(s) && getTagName(s) === tag);
    if (node) return node;
  }
}

async function describeElement(project: Project, node: ClassDeclaration) {
  const members = node.members.filter(
    (m): m is PropertyDeclaration => isPropertyDeclaration(m) && !!getDecoratorCall(m, PROP_DECORATORS),
  );
  const types = await project.checker.getTypeAtLocation(members.map((m) => m.name));
  const lines = await Promise.all(
    members.map(async (m, i) => {
      const decorator = getDecoratorCall(m, PROP_DECORATORS)!.name;
      return `- \`@${decorator} ${m.name.getText()}: ${await project.checker.typeToString(types[i])}\``;
    }),
  );
  return [`**${node.name?.text}**`, ...lines].join('\n');
}

async function getTemplateContext(api: API<true>, uri: string, position: Position) {
  const snapshot = await api.getCurrentLanguageServerSnapshot();
  const project = await snapshot.getDefaultProjectForFile({ uri });
  const file: SourceFile | undefined = await project?.program.getSourceFile({ uri });
  if (!project || !file) return;
  const offset = toOffset(file.text, position);
  const template = findAncestor(getTokenAtPosition(file, offset), isTaggedTemplateExpression);
  if (!template || !isIdentifier(template.tag) || !HTML_TAGS.has(template.tag.text)) return;
  return { project, file, offset };
}

export function createGemMiddleware(getApi: () => Promise<API<true>>): GemMiddleware {
  return {
    'textDocument/hover': async (result, { params }) => {
      const ctx = await getTemplateContext(await getApi(), params.textDocument.uri, params.position);
      const tag = ctx && getCustomTagAt(ctx.file.text, ctx.offset);
      const element = tag && (await findElement(ctx.project, tag));
      if (!element) return result;
      return { contents: { kind: 'markdown', value: await describeElement(ctx.project, element) } };
    },
  };
}
