import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dedent from 'dedent';
import { z } from 'zod';

const sources = {
  Gem: 'https://gemjs.org/llms.txt',
  Gemkit: 'https://gemkit.gemjs.org/llms.txt',
};

type Source = keyof typeof sources;

async function fetchText(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

// `llms.txt` 列出了所有页面的 Markdown 链接
async function downloadDocs(source: Source) {
  const llmsUrl = sources[source];
  const index = await fetchText(llmsUrl);
  const links = [...index.matchAll(/^- \[(.+)\]\((.+\.md)\)/gm)].map(([, name, path]) => ({
    source,
    name,
    url: new URL(path, llmsUrl).href,
  }));
  return Promise.all(links.map(async (link) => ({ ...link, content: await fetchText(link.url) })));
}

const docsCache = new Map<Source, Awaited<ReturnType<typeof downloadDocs>>>();
async function getDocs(source: Source) {
  const docs = docsCache.get(source) ?? (await downloadDocs(source));
  docsCache.set(source, docs);
  return docs;
}

const getAllDocs = async () => (await Promise.all((Object.keys(sources) as Source[]).map(getDocs))).flat();

const readDocs = (source: Source) => async () => ({
  contents: (await getDocs(source)).map(({ url, content }) => ({ uri: url, text: content, mimeType: 'text/markdown' })),
});

const server = new McpServer({
  name: 'Gem Framework Documentation',
  version: '1.0.0',
});

server.registerResource(
  'gem-documentation',
  'docs://gem/all',
  {
    title: 'Gem Documentation',
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
  readDocs('Gem'),
);

server.registerResource(
  'gemkit-documentation',
  'docs://gemkit/all',
  {
    title: 'Gemkit Documentation',
    description: dedent`Complete documentation for Gemkit - a Gem application framework built on Rsbuild.

      This resource contains all English documentation files including:
      - File-based routing, pages and layouts
      - Server data, form actions and API routes
      - Server elements, i18n, SSR and SSG
      - Deployment and configuration reference

      Use the search-gem-docs tool for targeted searches within the documentation.`,
    mimeType: 'text/markdown',
  },
  readDocs('Gemkit'),
);

server.registerTool(
  'search-gem-docs',
  {
    title: 'Search Gem Docs',
    description:
      'Search through Gem framework and Gemkit documentation by keyword. Returns relevant sections with context.',
    inputSchema: {
      query: z
        .string()
        .describe(
          'Search query to find relevant documentation. Examples: "component", "state", "lifecycle", "router", "layout", "SSR"',
        ),
      maxResults: z.number().optional().default(5).describe('Maximum number of results to return (default: 5)'),
    },
  },
  async ({ query, maxResults = 5 }) => {
    const docs = await getAllDocs();
    const lowerQuery = query.toLowerCase();

    const results = docs
      .filter(({ content, name }) => `${name} ${content}`.toLowerCase().includes(lowerQuery))
      .slice(0, maxResults)
      .map(({ source, name, url, content }) => {
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

        return `## [${source}] ${name}\n${url}\n${context}`;
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

server.registerPrompt(
  'gem-help',
  {
    title: 'Gem Help',
    description: 'Get help understanding Gem framework concepts with documentation lookup',
    argsSchema: {
      topic: z
        .string()
        .describe(
          'The Gem framework topic you need help with (e.g., "creating components", "state management", "routing", "lifecycle hooks")',
        ),
    },
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

server.registerPrompt(
  'learn-gem',
  {
    title: 'Learn Gem',
    description: 'Start learning the Gem framework from scratch',
  },
  () => ({
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
  }),
);

server.registerPrompt(
  'debug-gem',
  {
    title: 'Debug Gem',
    description: 'Debug issues in a Gem framework application',
    argsSchema: {
      problem: z
        .string()
        .describe(
          'Description of the problem you\'re facing (e.g., "component not rendering", "state not updating", "router not working")',
        ),
    },
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
