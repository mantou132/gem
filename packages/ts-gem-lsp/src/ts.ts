import type * as AstModule from 'typescript/unstable/ast';
import type * as ApiModule from 'typescript/unstable/async';

export interface TsModules {
  ast: typeof AstModule;
  api: typeof ApiModule;
}

export interface TsModuleLoader {
  importModule(exportPath: string): Promise<unknown>;
}

/**
 * API 客户端必须和语言服务器的 TypeScript 版本一致，所以运行时模块（包括枚举）由宿主加载后注入，
 * 不直接导入依赖中的 TypeScript
 */
export let ts: TsModules;

export async function loadTsModules(loader: TsModuleLoader) {
  const [ast, api] = await Promise.all([
    loader.importModule('typescript/unstable/ast'),
    loader.importModule('typescript/unstable/async'),
  ]);
  ts = { ast, api } as TsModules;
  return ts;
}
