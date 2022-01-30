import { esbuildPlugin } from '@web/dev-server-esbuild';

// https://modern-web.dev/docs/test-runner/cli-and-configuration/
// https://modern-web.dev/guides/test-runner/typescript/
export default {
  coverage: true,
  nodeResolve: true,
  files: ['./src/**/*.test.ts', './src/**/*.spec.ts'],
  plugins: [esbuildPlugin({ ts: true })],
};
