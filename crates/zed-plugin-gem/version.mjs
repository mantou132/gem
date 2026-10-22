// Run by `lerna version`: sync the bumped package.json version to the Zed extension manifests
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));

const replaces = [
  ['extension.toml', /^version = ".*"$/m, `version = "${version}"`],
  ['Cargo.toml', /^version = ".*"$/m, `version = "${version}"`],
  ['../../Cargo.lock', /(name = "gem"\nversion = )".*"/, `$1"${version}"`],
];

for (const [file, pattern, replacement] of replaces) {
  const content = readFileSync(file, 'utf8');
  if (!pattern.test(content)) throw new Error(`Version not found in ${file}`);
  writeFileSync(file, content.replace(pattern, replacement));
}

execFileSync('git', ['add', ...replaces.map(([file]) => file)]);
