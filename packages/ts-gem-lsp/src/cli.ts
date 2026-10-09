#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import program from 'commander';
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
import type { MessageConnection } from 'vscode-jsonrpc/node.js';
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node.js';

const SEVERITY = ['', 'error', 'warning', 'info', 'hint'];

const root = process.cwd();
let connection: MessageConnection;

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

function parsePosition(target: string) {
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
    if (program.opts().json) process.stdout.write(`${JSON.stringify({ file, items })}\n`);
    else for (const d of items) process.stdout.write(`${formatDiagnostic(uri, d)}\n`);
  }
  if (!program.opts().json) process.stdout.write(`${targets.length} files, ${problems} errors and warnings\n`);
  if (problems) process.exitCode = 1;
}

function print(value: unknown, lines: () => string[]) {
  process.stdout.write(program.opts().json ? `${JSON.stringify(value, null, 2)}\n` : `${lines().join('\n')}\n`);
}

async function initialize() {
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
}

// 启动语言服务器执行命令
function withServer<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
  return async (...args: T) => {
    const server = spawn(process.execPath, [path.join(import.meta.dirname, 'bin.js')], {
      cwd: root,
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    connection = createMessageConnection(new StreamMessageReader(server.stdout), new StreamMessageWriter(server.stdin));
    // 服务器发给客户端的请求（例如 `workspace/configuration`）
    connection.onRequest(() => null);
    connection.listen();

    try {
      await initialize();
      await fn(...args);
    } catch (err) {
      process.stderr.write(`${err instanceof Error ? err.message : err}\n`);
      process.exitCode = 1;
    }
    await connection.sendRequest('shutdown').catch(() => {});
    connection.sendNotification('exit');
    server.on('exit', () => process.exit());
  };
}

program
  .name('ts-gem')
  .description(
    'Run requests through the ts-gem-lsp language server, the project is the current directory, line and column are 1-based',
  )
  .option('--json', 'print the raw LSP result as JSON');

program
  .command('check [files...]')
  .description('diagnostics (TypeScript + Gem), checks all source files in the current directory by default')
  .action(withServer(check));

program
  .command('hover <file:line:col>')
  .description('hover information')
  .action(
    withServer(async (position: string) => {
      const hover: Hover | null = await connection.sendRequest('textDocument/hover', parsePosition(position));
      print(hover, () => [hoverText(hover) || '(none)']);
    }),
  );

program
  .command('complete <file:line:col>')
  .description('completion')
  .action(
    withServer(async (position: string) => {
      const result: CompletionList | CompletionItem[] | null = await connection.sendRequest(
        'textDocument/completion',
        parsePosition(position),
      );
      const items = Array.isArray(result) ? result : (result?.items ?? []);
      print(result, () => [
        `${items.length} items`,
        ...items.map((i) => `  ${i.label}${i.detail ? `  ${i.detail}` : ''}`),
      ]);
    }),
  );

for (const [command, method, description] of [
  ['definition', 'definition', 'go to definition'],
  ['references', 'references', 'find references'],
  ['highlight', 'documentHighlight', 'document highlight'],
]) {
  program
    .command(`${command} <file:line:col>`)
    .description(description)
    .action(
      withServer(async (position: string) => {
        const params = parsePosition(position);
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
      }),
    );
}

program
  .command('rename <file:line:col> <newName>')
  .description('rename symbol')
  .action(
    withServer(async (position: string, newName: string) => {
      const params = parsePosition(position);
      // 和编辑器一样先检查能否重命名
      const prepare = await connection.sendRequest('textDocument/prepareRename', params).catch((err: Error) => {
        throw new Error(`Cannot rename: ${err.message}`);
      });
      const edit: WorkspaceEdit | null = await connection.sendRequest('textDocument/rename', { ...params, newName });
      print({ prepare, edit }, () => (edit ? formatEdits(workspaceEditChanges(edit)) : ['(none)']));
    }),
  );

program
  .command('request <method> <file:line:col> [params]')
  .description('send any request, params is JSON merged into the request params')
  .action(
    withServer(async (method: string, position: string, merge = '{}') => {
      const result = await connection.sendRequest(method, { ...parsePosition(position), ...JSON.parse(merge) });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    }),
  );

await program.parseAsync(process.argv);
