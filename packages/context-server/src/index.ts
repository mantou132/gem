import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import AdmZip from 'adm-zip';

async function downloadDocs() {
  const res = await fetch('https://github.com/mantou132/gem/archive/refs/heads/main.zip');
  const buf = await res.arrayBuffer();
  const zip = new AdmZip(Buffer.from(buf));
  const zipEntries = zip.getEntries();
  return zipEntries
    .filter((entry) => entry.entryName.includes('packages/gem/docs/en') && entry.entryName.endsWith('.md'))
    .map((e) => ({
      entryName: e.entryName,
      content: zip.readAsText(e),
    }));
}

const server = new McpServer({
  name: 'Gem',
  version: '0.0.1',
});

let docsCache: Awaited<ReturnType<typeof downloadDocs>> | undefined;
server.resource('docs', 'docs://all', async () => {
  const docs = docsCache || (docsCache = await downloadDocs());
  return {
    contents: docs.map(({ entryName, content }) => ({ uri: `docs://${entryName}`, text: content })),
  };
});

const transport = new StdioServerTransport();
server.connect(transport);
