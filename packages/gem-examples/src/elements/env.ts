type Manifest = typeof import('../hello-world/manifest.json');

export const EXAMPLES = process.env.EXAMPLES as unknown as Partial<Manifest>[];
export const VERSION = process.env.VERSION as unknown as string;
