const { writeFileSync } = require('fs');
const { resolve: pathResolve } = require('path');
const { spawnSync } = require('child_process');
const semver = require('semver');
const inquirer = require('inquirer');

const pkg = require('../package.json');

const writeFile = (path, content) => {
  writeFileSync(
    pathResolve(__dirname, path),
    typeof content === 'object' ? JSON.stringify(content, null, 2) + '\n' : content,
  );
};

// Parameter does not support string
const exec = (command) => {
  const [program, ...args] = command.split(/\s+/);
  spawnSync(program, args, { stdio: 'inherit' });
};

const main = (version) => {
  pkg.version = version;
  writeFile('../package.json', pkg);

  writeFile('../src/lib/version.ts', `// Do not modify manually\nexport const version = '${version}';\n`);
  exec('npm run lint');
  exec(`git commit -a -m ${version}`);
  exec('git push');
  exec(`git tag ${version}`);
  exec('git push --tags');
  exec('npx release');
};

const arg = process.argv[2];
if (arg) {
  const version = semver.valid(arg);
  if (version) {
    main(version);
  } else {
    throw new Error('invalid arg');
  }
} else {
  inquirer
    .prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Which publishing type to use?',
        choices: ['patch', 'minor', 'major'],
      },
    ])
    .then((answers) => {
      main(semver.inc(pkg.version, answers.type));
    })
    .catch((error) => {
      throw error;
    });
}
