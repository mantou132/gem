import { notFound, redirect, type ServerLoadContext } from '@mantou/gemkit';

import { i18n } from '$gemkit/i18n';
import { getDoc, getPagePaths, getRedirect } from '../lib/content.server';

export async function load({ params }: ServerLoadContext<{ slug: string }>) {
  const lang = i18n.currentLanguage;
  const pagePath = `/${params.slug}`;
  const target = getRedirect(lang, pagePath);
  if (target) redirect(301, target);
  return (await getDoc(lang, pagePath)) || notFound();
}

export const paths = ({ lang }: { lang: string }) => getPagePaths(lang).map((path) => ({ slug: path.slice(1) }));
