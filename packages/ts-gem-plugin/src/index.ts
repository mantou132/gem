// FIXME: css('xx', `:host ${1}`) `getQuickInfoAtPosition` `getCompletionsAtPosition`
// FIXME: nested html style `getSyntacticDiagnostics`
import { decorateWithTemplateLanguageService } from '@mantou/typescript-template-language-service-decorator';
import type { Logger } from '@mantou/typescript-template-language-service-decorator';
import type * as ts from 'typescript/lib/tsserverlibrary';

import { HTMLLanguageService } from './decorate-html';
import type { Context } from './decorate-ts';
import { decorateLanguageService } from './decorate-ts';
import { decorate, getSubstitution, isValidCSSTemplate } from './utils';
import { Configuration } from './configuration';
import { CSSLanguageService } from './decorate-css';

class LanguageServiceLogger implements Logger {
  #info: ts.server.PluginCreateInfo;
  constructor(info: ts.server.PluginCreateInfo) {
    this.#info = info;
  }

  log(msg: string) {
    this.#info.project.projectService.logger.info(`[gem] ${msg}`);
  }
}

class HtmlPlugin {
  #ts: typeof ts;
  #config = new Configuration();

  constructor(typescript: typeof ts) {
    this.#ts = typescript;
  }

  create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    return decorate(info.languageService, () => {
      const logger = new LanguageServiceLogger(info);
      logger.log('Starting ts-gem-plugin...');
      this.#config.update(info.config);

      const context: Context = {
        config: this.#config,
        ts: this.#ts,
        logger,
        getProgram: () => {
          return info.languageService.getProgram()!;
        },
        getProject: () => {
          return info.project;
        },
      };

      const decoratedService = decorateLanguageService(info.languageService, context);

      const decoratedService1 = decorateWithTemplateLanguageService(
        this.#ts,
        decoratedService,
        info.project,
        new CSSLanguageService(context),
        {
          tags: ['styled', 'css'],
          enableForStringWithSubstitutions: true,
          getSubstitution,
          isValidTemplate: (node) => isValidCSSTemplate(this.#ts, node, 'css'),
        },
        { logger },
      );

      return decorateWithTemplateLanguageService(
        this.#ts,
        decoratedService1,
        info.project,
        new HTMLLanguageService(context),
        {
          tags: ['html', 'raw', 'h'],
          enableForStringWithSubstitutions: true,
          getSubstitution,
        },
        { logger },
      );
    });
  }

  onConfigurationChanged(config: any) {
    this.#config.update(config);
  }
}

export = (mod: { typescript: typeof ts }) => new HtmlPlugin(mod.typescript);
