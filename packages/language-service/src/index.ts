#!/usr/bin/env node

// biome-ignore assist/source/organizeImports: export/path
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createConnection, ProposedFeatures, TextDocuments } from 'vscode-languageserver/node';

import { Provider } from './provider';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize(() => {
  return {
    capabilities: {
      colorProvider: true,
      documentSymbolProvider: true,
    },
  };
});

const provider = new Provider();

connection.onColorPresentation(({ color }) => {
  return provider.provideColorPresentations(color);
});

connection.onDocumentColor(({ textDocument }) => {
  return provider.provideDocumentColors(documents.get(textDocument.uri)!);
});

connection.onDocumentSymbol(({ textDocument }) => {
  return provider.provideDocumentSymbols(documents.get(textDocument.uri)!);
});

documents.listen(connection);
connection.listen();
