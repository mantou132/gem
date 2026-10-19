import { i18n } from '$gemkit/i18n';
import { getSite } from '../lib/content.server';

// 语言由请求路径决定，每个请求独立
export const load = () => getSite(i18n.currentLanguage);
