#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type {
  CompletionItem,
  CompletionList,
  Diagnostic,
  DocumentDiagnosticReport,
  DocumentHighlight,
  Hover,
  Location,
  LocationLink,
  MarkupContent,
  Range,
  TextEdit,
  WorkspaceEdit,
} from 'typescript/unstable/vscode';
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node.js';

const USAGE = `Usage: ts-gem <command> [args] [--json]

通过 ts-gem-lsp 语言服务器执行请求，项目为当前目录，行号和列号从 1 开始

Commands:
  check [files...]                  诊断（TypeScript + Gem），默认检查当前目录下的所有源文件
  hover <file:line:col>             悬停信息
  complete <file:line:col>          补全
  definition <file:line:col>        跳转定义
  references <file:line:col>        查找引用
  highlight <file:line:col>         文档高亮
  rename <file:line:col> <newName>  重命名
  request <method> <file:line:col> [params]
                                    发送任意请求，params 是合并到请求参数的 JSON
`;

const SEVERITY = ['', 'error', 'warning', 'info', 'hint'];

const args = process.argv.slice(2).filter((arg) => arg !== '--json');
const json = process.argv.includes('--json');
const [command, ...rest] = args;
if (!command || command === '--help' || command === '-h') {
  process.stdout.write(USAGE);
  process.exit(command ? 0 : 1);
}

const root = process.cwd();
const server = spawn(process.execPath, [path.join(import.meta.dirname, 'bin.js')], {
  cwd: root,
  stdio: ['pipe', 'pipe', 'inherit'],
});
const connection = createMessageConnection(
  new StreamMessageReader(server.stdout),
  new StreamMessageWriter(server.stdin),
);
// 服务器发给客户端的请求（例如 `workspace/configuration`）
connection.onRequest(() => null);
connection.listen();

const opened = new Set<string>();
function open(file: string) {
  const uri = pathToFileURL(path.resolve(root, file)).href;
  if (!opened.has(uri)) {
    opened.add(uri);
    const text = readFileSync(fileURLToPath(uri), 'utf8');
    connection.sendNotification('textDocument/didOpen', {
      textDocument: { uri, languageId: 'typescript', version: 1, text },
    });
  }
  return uri;
}

function parsePosition(target = '') {
  const match = target.match(/^(.+):(\d+):(\d+)$/);
  if (!match) throw new Error(`Invalid position '${target}', expected <file:line:col>`);
  const [, file, line, col] = match;
  const uri = open(file);
  return { textDocument: { uri }, position: { line: Number(line) - 1, character: Number(col) - 1 } };
}

function formatLocation(uri: string, range: Range) {
  const file = fileURLToPath(uri);
  const lineText = readFileSync(file, 'utf8').split('\n')[range.start.line] ?? '';
  const text =
    range.start.line === range.end.line ? lineText.slice(range.start.character, range.end.character) : lineText.trim();
  return `${path.relative(root, file)}:${range.start.line + 1}:${range.start.character + 1}  «${text}»`;
}

function formatDiagnostic(uri: string, d: Diagnostic) {
  const code = [d.source, d.code].filter((e) => e !== undefined).join(' ');
  return `${formatLocation(uri, d.range)}  ${SEVERITY[d.severity ?? 1]} [${code}] ${d.message}`;
}

function formatEdits(changes: Record<string, TextEdit[]>) {
  return Object.entries(changes).flatMap(([uri, edits]) =>
    edits.map((edit) => `${formatLocation(uri, edit.range)} -> ${edit.newText}`),
  );
}

function workspaceEditChanges(edit: WorkspaceEdit) {
  const changes: Record<string, TextEdit[]> = { ...edit.changes };
  for (const change of edit.documentChanges ?? []) {
    if (!('edits' in change)) continue;
    changes[change.textDocument.uri] = [...(changes[change.textDocument.uri] ?? []), ...(change.edits as TextEdit[])];
  }
  return changes;
}

function hoverText(hover: Hover | null) {
  if (!hover) return '';
  const contents = Array.isArray(hover.contents) ? hover.contents : [hover.contents];
  return contents.map((c) => (typeof c === 'string' ? c : (c as MarkupContent).value)).join('\n\n');
}

async function check(files: string[]) {
  const targets = files.length
    ? files
    : globSync('**/*.{ts,tsx,mts,cts}', { cwd: root, exclude: (f) => /node_modules|\bdist\b|\.d\.ts$/.test(f) });
  let problems = 0;
  for (const file of targets) {
    const uri = open(file);
    const report: DocumentDiagnosticReport = await connection.sendRequest('textDocument/diagnostic', {
      textDocument: { uri },
    });
    const items = report.kind === 'full' ? report.items : [];
    problems += items.filter((d) => (d.severity ?? 1) <= 2).length;
    if (json) process.stdout.write(`${JSON.stringify({ file, items })}\n`);
    else for (const d of items) process.stdout.write(`${formatDiagnostic(uri, d)}\n`);
  }
  if (!json) process.stdout.write(`${targets.length} files, ${problems} errors and warnings\n`);
  return problems ? 1 : 0;
}

async function run(): Promise<number> {
  await connection.sendRequest('initialize', {
    processId: process.pid,
    rootUri: pathToFileURL(root).href,
    capabilities: {
      textDocument: {
        completion: { completionItem: { snippetSupport: true } },
        hover: { contentFormat: ['markdown', 'plaintext'] },
        definition: { linkSupport: true },
        rename: { prepareSupport: true },
        diagnostic: {},
      },
    },
  });
  connection.sendNotification('initialized', {});

  if (command === 'check') return check(rest);
  if (command === 'request') {
    const [method, position, merge] = rest;
    const result = await connection.sendRequest(method, { ...parsePosition(position), ...JSON.parse(merge ?? '{}') });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }

  const [target, extra] = rest;
  const params = parsePosition(target);
  const print = (value: unknown, lines: () => string[]) => {
    process.stdout.write(json ? `${JSON.stringify(value, null, 2)}\n` : `${lines().join('\n')}\n`);
  };

  switch (command) {
    case 'hover': {
      const hover: Hover | null = await connection.sendRequest('textDocument/hover', params);
      print(hover, () => [hoverText(hover) || '(none)']);
      return 0;
    }
    case 'complete': {
      const result: CompletionList | CompletionItem[] | null = await connection.sendRequest(
        'textDocument/completion',
        params,
      );
      const items = Array.isArray(result) ? result : (result?.items ?? []);
      print(result, () => [
        `${items.length} items`,
        ...items.map((i) => `  ${i.label}${i.detail ? `  ${i.detail}` : ''}`),
      ]);
      return 0;
    }
    case 'definition':
    case 'references':
    case 'highlight': {
      const method = { definition: 'definition', references: 'references', highlight: 'documentHighlight' }[command];
      const extraParams = command === 'references' ? { context: { includeDeclaration: true } } : {};
      const result: (Location | LocationLink | DocumentHighlight)[] | Location | null = await connection.sendRequest(
        `textDocument/${method}`,
        { ...params, ...extraParams },
      );
      const list = result ? (Array.isArray(result) ? result : [result]) : [];
      print(result, () =>
        list.length
          ? list.map((l) =>
              'targetUri' in l
                ? formatLocation(l.targetUri, l.targetSelectionRange)
                : formatLocation('uri' in l ? l.uri : params.textDocument.uri, l.range),
            )
          : ['(none)'],
      );
      return 0;
    }
    case 'rename': {
      if (!extra) throw new Error('Missing <newName>');
      // 和编辑器一样先检查能否重命名
      const prepare = await connection.sendRequest('textDocument/prepareRename', params).catch((err: Error) => {
        throw new Error(`Cannot rename: ${err.message}`);
      });
      const edit: WorkspaceEdit | null = await connection.sendRequest('textDocument/rename', {
        ...params,
        newName: extra,
      });
      print({ prepare, edit }, () => (edit ? formatEdits(workspaceEditChanges(edit)) : ['(none)']));
      return 0;
    }
    default:
      process.stdout.write(USAGE);
      return 1;
  }
}

let exitCode = 1;
try {
  exitCode = await run();
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.message : err}\n`);
}
await connection.sendRequest('shutdown').catch(() => {});
connection.sendNotification('exit');
server.on('exit', () => process.exit(exitCode));
