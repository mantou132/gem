// Wait: https://github.com/evanw/esbuild/issues/104

import { esbuildPlugin } from '@web/dev-server-esbuild';

// https://modern-web.dev/docs/test-runner/cli-and-configuration/
// https://modern-web.dev/guides/test-runner/typescript/
/**
 * @type {import('@web/test-runner').TestRunnerConfig}
 */
export default {
  coverage: true,
  nodeResolve: true,
  files: ['./test/**/*.test.js', './test/**/*.spec.js'],
  plugins: [esbuildPlugin({ ts: true, tsconfig: './tsconfig.json' })],
};
