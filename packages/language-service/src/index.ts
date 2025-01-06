#!/usr/bin/env node

import type { InitializeParams } from 'vscode-languageserver/node';
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { debounce } from 'duoyun-ui/lib/timer';

import { getDiagnostics } from './diagnostic';
import { CSSHoverProvider, HTMLHoverProvider, StyleHoverProvider } from './hover';
import { CSSCompletionItemProvider, HTMLStyleCompletionItemProvider } from './css';
import { HTMLCompletionItemProvider } from './html';
import { StyleCompletionItemProvider } from './style';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize(({ capabilities }: InitializeParams) => {
  hasConfigurationCapability = !!capabilities.workspace?.configuration;
  hasWorkspaceFolderCapability = !!capabilities.workspace?.workspaceFolders;
  hasDiagnosticRelatedInformationCapability = !!capabilities.textDocument?.publishDiagnostics?.relatedInformation;
  return {
    capabilities: {
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['!', '.', '}', ':', '*', '$', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '<'],
      },
      hoverProvider: true,
      colorProvider: true,
      textDocumentSync: TextDocumentSyncKind.Incremental,
      workspace: !hasWorkspaceFolderCapability ? undefined : { workspaceFolders: { supported: true } },
    },
  };
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

interface ExampleSettings {
  maxNumberOfProblems: number;
}

const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };

let globalSettings: ExampleSettings = defaultSettings;
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    documentSettings.clear();
  } else {
    globalSettings = <ExampleSettings>(change.settings.languageServerGem || defaultSettings);
  }
  documents.all().forEach(validateTextDocument);
});

function _getDocumentSettings(resource: string) {
  if (!hasConfigurationCapability) return globalSettings;
  if (!documentSettings.has(resource)) {
    const settings = connection.workspace.getConfiguration({ scopeUri: resource, section: 'languageServerGem' });
    documentSettings.set(resource, settings);
  }
  return documentSettings.get(resource)!;
}

documents.onDidClose((e) => documentSettings.delete(e.document.uri));

documents.onDidChangeContent((change) => validateTextDocument(change.document));

const validateTextDocument = debounce((textDocument: TextDocument) => {
  connection.sendDiagnostics({
    uri: textDocument.uri,
    diagnostics: getDiagnostics(textDocument, hasDiagnosticRelatedInformationCapability),
  });
});

connection.onDidChangeWatchedFiles((_change) => {
  connection.console.log('We received a file change event');
});

const completionItemProviders = [
  new CSSCompletionItemProvider(),
  new HTMLStyleCompletionItemProvider(),
  new HTMLCompletionItemProvider(connection),
  new StyleCompletionItemProvider(),
];
connection.onCompletion(async ({ textDocument, position }) => {
  for (const provider of completionItemProviders) {
    const result = await provider.provideCompletionItems(documents.get(textDocument.uri)!, position);
    if (result) return { isIncomplete: true, items: result.items };
  }
});

connection.onCompletionResolve((item) => item);

const hoverProviders = [new CSSHoverProvider(), new StyleHoverProvider(), new HTMLHoverProvider()];
connection.onHover(({ textDocument, position }) => {
  for (const provider of hoverProviders) {
    const result = provider.provideHover(documents.get(textDocument.uri)!, position);
    if (result) return result;
  }
});

documents.listen(connection);
connection.listen();
