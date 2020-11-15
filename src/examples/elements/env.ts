type Manifest = typeof import('../index/manifest.json');

export const MATADATA = (process.env.METADATA as unknown) as Record<string, Partial<Manifest>>;
export const EXAMPLES = (process.env.EXAMPLES as unknown) as string[];
export const EXAMPLE = process.env.EXAMPLE as string;
export const FILES = (process.env.FILES as unknown) as string[];
export const PATH = process.env.TAEGET === 'pages' && EXAMPLE !== 'index' ? EXAMPLE : '';
