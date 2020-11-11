const { writeFileSync } = require('fs');
const { resolve: pathResolve } = require('path');
const { execSync } = require('child_process');
const semver = require('semver');
const inquirer = require('inquirer');

const pkg = require('../package.json');
const pkgLock = require('../package-lock.json');

const writeFile = (path, content) => {
  writeFileSync(
    pathResolve(__dirname, path),
    typeof content === 'object' ? JSON.stringify(content, null, 2) + '\n' : content,
  );
};

const main = (version) => {
  pkg.version = version;
  writeFile('../package.json', pkg);
  pkgLock.version = version;
  writeFile('../package-lock.json', pkgLock);
  writeFile('../src/version.ts', `// Do not modify manually\nexport const version = '${version}';\n`);
  execSync('npm run lint');
  execSync(`git commit -a -m 'Update to ${version}'`);
  execSync('git push');
  execSync(`git tag ${version}`);
  execSync('git push --tags');
  execSync('npx release');
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
