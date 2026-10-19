import { i18n } from '$gemkit/i18n';
import { getLlms } from '../lib/content.server';

export const load = () => getLlms(i18n.currentLanguage);
