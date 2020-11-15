const fs = require('fs');
const util = require('util');
const childProcess = require('child_process');
const ora = require('ora');

const exec = util.promisify(childProcess.exec);

const spinner = ora('Start compile...').start();

fs.readdirSync('src/examples')
  .filter((example) => example !== 'elements')
  .reduce(async (prevTask, name, index, arr) => {
    await prevTask;
    spinner.text = `compile \`${name}\` ${index + 1}/${arr.length}`;
    return await exec('webpack', {
      env: Object.assign(process.env, {
        TAEGET: 'pages',
        NAME: name,
      }),
    });
  }, Promise.resolve())
  .then(() => {
    spinner.succeed();
  });
