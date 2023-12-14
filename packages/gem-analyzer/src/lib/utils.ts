import { ClassInstancePropertyTypes, MethodDeclaration } from 'ts-morph';

export function getJsDoc(declaration: ClassInstancePropertyTypes | MethodDeclaration) {
  if ('getJsDocs' in declaration) {
    const jsDocs = declaration.getJsDocs();
    const deprecated = jsDocs
      .map((jsDoc) => jsDoc.getTags())
      .flat()
      .some((e) => e.getTagName() === 'deprecated');
    const comment = jsDocs.map((jsDoc) => jsDoc.getCommentText()).join('\n\n');
    return {
      deprecated,
      description: `${deprecated ? '@deprecated ' : ''}${comment || undefined}`,
    };
  }
}
