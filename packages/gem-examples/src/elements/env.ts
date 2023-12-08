type Manifest = typeof import('../hello-world/manifest.json');

export const METADATA = process.env.METADATA as unknown as Record<string, Partial<Manifest>>;
export const EXAMPLES = process.env.EXAMPLES as unknown as string[];
