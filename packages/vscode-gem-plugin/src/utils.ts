import * as child_process from 'node:child_process';
import type { Readable } from 'node:stream';

import { ProgressLocation, window } from 'vscode';

async function readStdio(stdout: Readable) {
  let out = '';
  for await (const k of stdout) {
    out += k;
  }
  return out;
}

export function exec(command: string, input = '', options: child_process.SpawnOptions = {}): Promise<string> {
  return new Promise<string>((res, rej) => {
    const [c, ...args] = command.split(/\s+/);
    const child = child_process.spawn(c, args, { shell: true, ...options });
    const stdout = child.stdout ? readStdio(child.stdout) : '';
    const stderr = child.stderr ? readStdio(child.stderr) : '';
    child.on('error', rej);
    child.on('exit', async (code) => {
      if (code === 0) {
        res(await stdout);
      } else {
        rej(new Error(await stderr));
      }
    });
    child.stdin?.write(input);
    child.stdin?.end();
  });
}

export function showTask<T>(title: string, task: Thenable<T>, duration?: number) {
  return window.withProgress({ title, location: ProgressLocation.Notification, cancellable: false }, (progress) => {
    if (duration) {
      const steps = 100;
      const delay = duration / steps;

      for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
          progress.report({ increment: 1 });
        }, i * delay);
      }
    }

    return task;
  });
}
