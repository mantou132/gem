import { notFound, redirect, type ServerLoadContext } from '@mantou/gemkit';

import { i18n, localizePath } from '$gemkit/i18n';
import { getDoc, getPagePaths, getRedirect } from '../lib/content.server';

export async function load({ params }: ServerLoadContext<{ 0: string }>) {
  const lang = i18n.currentLanguage;
  const pagePath = `/${params[0]}`;
  const target = getRedirect(lang, pagePath);
  if (target) redirect(301, localizePath(lang, target));
  return (await getDoc(lang, pagePath)) || notFound();
}

export const paths = ({ lang }: { lang: string }) => getPagePaths(lang).map((path) => ({ 0: path.slice(1) }));
