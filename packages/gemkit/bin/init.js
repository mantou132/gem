import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Eta } from 'eta';

const starterDir = fileURLToPath(new URL('../starter', import.meta.url));

const eta = new Eta({ autoEscape: false, autoTrim: false });

/** 用 `starter` 模板初始化项目，目录不存在或者为空，`.eta` 文件渲染后去掉扩展名（npm 发布时会忽略 `.gitignore`） */
export function init(dir = '.') {
  const targetDir = path.resolve(dir);

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length) {
    console.error(`Directory ${targetDir} is not empty`);
    process.exit(1);
  }

  // 依赖当前版本的 gemkit 和它依赖的 gem、Rsbuild，模板和 gemkit 一起更新
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const data = {
    name: path.basename(targetDir),
    version: pkg.version,
    deps: { ...pkg.dependencies, ...pkg.peerDependencies },
  };

  fs.cpSync(starterDir, targetDir, {
    recursive: true,
    filter: (src, dest) => {
      if (!src.endsWith('.eta')) return true;
      fs.writeFileSync(dest.slice(0, -'.eta'.length), eta.renderString(fs.readFileSync(src, 'utf8'), data));
      return false;
    },
  });

  // 例如 `pnpm/10.33.2 npm/? node/v22.13.1 darwin arm64`
  const pm = process.env.npm_config_user_agent?.split('/')[0] || 'npm';
  const relDir = path.relative(process.cwd(), targetDir);

  console.log(`
Created ${data.name}, next:

${relDir ? `  cd ${relDir}\n` : ''}  ${pm} install
  ${pm} run dev
`);
}
