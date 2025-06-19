import { getCSSLanguageService, type Stylesheet } from '@mantou/vscode-css-languageservice';
import { getLanguageService as getHTMLanguageService, type HTMLDocument } from '@mantou/vscode-html-languageservice';
import { Cache } from 'duoyun-ui/lib/cache';

import { CSTDocs } from './documents';

export const cssLanguageService = getCSSLanguageService();
export const htmlLanguageService = getHTMLanguageService();
export const documents = new CSTDocs();
export const cssCache = new Cache<Stylesheet>({ max: 1000 });
export const htmlCache = new Cache<HTMLDocument>({ max: 1000 });
