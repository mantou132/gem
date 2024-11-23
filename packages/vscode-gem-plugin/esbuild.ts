import { context } from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await context({
    entryPoints: ['src/extension.ts', 'src/server.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outdir: 'dist',
    external: ['vscode'],
    logLevel: 'silent',
    mainFields: ['module', 'main'],
    plugins: [
      {
        name: 'esbuild-problem-matcher',
        setup(build) {
          build.onStart(() => {
            console.log('[watch] build started');
          });
          build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
              console.error(`✘ [ERROR] ${text}`);
              if (location) {
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
              }
            });
            console.log('[watch] build finished');
          });
        },
      },
    ],
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
