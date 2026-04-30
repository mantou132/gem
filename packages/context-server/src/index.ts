import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import AdmZip from 'adm-zip';
import dedent from 'dedent';
import { z } from 'zod';

async function downloadDocs() {
  const res = await fetch('https://github.com/mantou132/gem/archive/refs/heads/main.zip');
  if (!res.ok) {
    throw new Error(`Failed to download docs: ${res.status} ${res.statusText}`);
  }
  const buf = await res.arrayBuffer();
  const zip = new AdmZip(Buffer.from(buf));
  const zipEntries = zip.getEntries();
  return zipEntries
    .filter((entry) => entry.entryName.includes('packages/gem/docs/en') && entry.entryName.endsWith('.md'))
    .map((e) => ({
      entryName: e.entryName,
      name: e.entryName.split('/').pop()?.replace('.md', '') || e.entryName,
      content: zip.readAsText(e),
    }));
}

let docsCache: Awaited<ReturnType<typeof downloadDocs>> | undefined;
async function getDocs() {
  if (!docsCache) docsCache = await downloadDocs();
  return docsCache;
}

const server = new McpServer({
  name: 'Gem Framework Documentation',
  version: '1.0.0',
});

server.resource(
  'gem-documentation',
  'docs://gem/all',
  {
    description: dedent`Complete documentation for the Gem framework - a lightweight, reactive web framework for building modern web applications.

      This resource contains all English documentation files including:
      - Getting Started guides
      - Component creation and lifecycle
      - State management patterns
      - Routing and navigation
      - API references
      - Best practices and examples

      Documentation is organized in markdown files covering different aspects of the framework.
      Use the search-gem-docs tool for targeted searches within the documentation.`,
    mimeType: 'text/markdown',
  },
  async () => {
    const docs = await getDocs();
    return {
      contents: docs.map(({ entryName, content }) => ({
        uri: `docs://gem/${entryName}`,
        text: content,
        mimeType: 'text/markdown',
      })),
    };
  },
);

server.tool(
  'search-gem-docs',
  'Search through Gem framework documentation by keyword. Returns relevant sections with context.',
  {
    query: z
      .string()
      .describe(
        'Search query to find relevant documentation. Examples: "component", "state", "lifecycle", "router", "reactive"',
      ),
    maxResults: z.number().optional().default(5).describe('Maximum number of results to return (default: 5)'),
  },
  async ({ query, maxResults = 5 }) => {
    const docs = await getDocs();
    const lowerQuery = query.toLowerCase();

    const results = docs
      .filter(({ content, name }) => `${name} ${content}`.toLowerCase().includes(lowerQuery))
      .slice(0, maxResults)
      .map(({ name, content }) => {
        const lines = content.split('\n');
        const matchedIndices: number[] = [];

        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(lowerQuery)) {
            matchedIndices.push(index);
          }
        });

        const contextLines = new Set<number>();
        matchedIndices.forEach((idx) => {
          for (let i = Math.max(0, idx - 2); i <= Math.min(lines.length - 1, idx + 2); i++) {
            contextLines.add(i);
          }
        });

        const context = Array.from(contextLines)
          .sort((a, b) => a - b)
          .map((i) => `Line ${i + 1}: ${lines[i].trim()}`)
          .join('\n');

        return `## ${name}\n${context}`;
      });

    return {
      content: [
        {
          type: 'text',
          text:
            results.length > 0
              ? dedent`Found ${results.length} result(s) for "${query}":

                  ${results.join('\n\n---\n\n')}`
              : dedent`No results found for "${query}". Try different keywords like "component", "state", "router", etc.`,
        },
      ],
    };
  },
);

server.prompt(
  'gem-help',
  'Get help understanding Gem framework concepts with documentation lookup',
  {
    topic: z
      .string()
      .describe(
        'The Gem framework topic you need help with (e.g., "creating components", "state management", "routing", "lifecycle hooks")',
      ),
  },
  ({ topic }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: dedent`I need help understanding "${topic}" in the Gem framework.
            Please use the search-gem-docs tool to find relevant documentation and provide a comprehensive explanation with code examples if available.`,
        },
      },
    ],
  }),
);

server.prompt('learn-gem', 'Start learning the Gem framework from scratch', () => ({
  messages: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: dedent`I want to learn the Gem framework. Please:
          1. Use the search-gem-docs tool to find "getting started" documentation
          2. Explain the core concepts and philosophy
          3. Show me a simple example to begin with
          4. Guide me on what to learn next`,
      },
    },
  ],
}));

server.prompt(
  'debug-gem',
  'Debug issues in a Gem framework application',
  {
    problem: z
      .string()
      .describe(
        'Description of the problem you\'re facing (e.g., "component not rendering", "state not updating", "router not working")',
      ),
  },
  ({ problem }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: dedent`I'm having an issue with my Gem framework application: ${problem}

            Please use the search-gem-docs tool to find relevant documentation about this issue and suggest possible solutions or debugging steps.`,
        },
      },
    ],
  }),
);

const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
