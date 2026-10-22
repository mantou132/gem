import type { JSDoc, JSDocParameterTag, ModifierLike, Node } from 'tsrs/unstable/ast';
import {
  getJSDocCommentsAndTags,
  getTextOfJSDocComment,
  isJSDoc,
  isJSDocParameterTag,
  type SyntaxKind,
} from 'tsrs/unstable/ast';

export function getJsDocs(node: Node) {
  return getJSDocCommentsAndTags(node).filter((e): e is JSDoc => isJSDoc(e));
}

export function getJsDocText(jsDoc: JSDoc) {
  return getTextOfJSDocComment(jsDoc.comment) || '';
}

export function getJsDoc(node: Node) {
  const jsDocs = getJsDocs(node);
  const deprecated = jsDocs.some((jsDoc) => jsDoc.tags?.some((tag) => tag.tagName.text === 'deprecated'));
  const comment = jsDocs.map(getJsDocText).join('\n\n');
  return {
    deprecated,
    description: `${deprecated ? '@deprecated ' : ''}${comment}`,
  };
}

/** `@param name comment` */
export function getJsDocParams(node: Node) {
  return getJsDocs(node)
    .flatMap((jsDoc) => jsDoc.tags ?? [])
    .filter((tag): tag is JSDocParameterTag => isJSDocParameterTag(tag))
    .map((tag) => ({ name: tag.name.getText(), comment: getTextOfJSDocComment(tag.comment) }));
}

export function getJsDocTag(node: Node, tagName: string) {
  const tag = getJsDocs(node)
    .flatMap((jsDoc) => jsDoc.tags ?? [])
    .find((e) => e.tagName.text === tagName);
  return tag && getTextOfJSDocComment(tag.comment);
}

export function getModifiers(node: Node) {
  return (node as { modifiers?: readonly ModifierLike[] }).modifiers ?? [];
}

export function hasModifier(node: Node, kind: SyntaxKind) {
  return getModifiers(node).some((e) => e.kind === kind);
}

export function isPrivateId(name: string) {
  return name.startsWith('#') || name.startsWith('_');
}
