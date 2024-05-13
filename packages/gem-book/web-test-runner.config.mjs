import { esbuildPlugin } from '@web/dev-server-esbuild';

// https://modern-web.dev/docs/test-runner/cli-and-configuration/
// https://modern-web.dev/guides/test-runner/typescript/
/**
 * @type {import('@web/test-runner').TestRunnerConfig}
 */
export default {
  coverage: true,
  coverageConfig: { exclude: ['**/__wds-outside-root__/**'] },
  nodeResolve: true,
  files: ['./src/**/*.test.ts', './src/**/*.spec.ts'],
  plugins: [esbuildPlugin({ ts: true, tsconfig: './tsconfig.json', target: 'es2022' })],
};
