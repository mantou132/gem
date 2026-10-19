import { i18n } from '$gemkit/i18n';
import { getSearchIndex } from '../lib/content.server';

export const load = () => (__GEM_BOOK_CONFIG__.docsearch === 'local' ? getSearchIndex(i18n.currentLanguage) : []);
