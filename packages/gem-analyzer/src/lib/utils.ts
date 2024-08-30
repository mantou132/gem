import {
  ClassInstancePropertyTypes,
  MethodDeclaration,
  ExportedDeclarations,
  ClassStaticPropertyTypes,
} from 'ts-morph';

export function getJsDoc(declaration: ClassInstancePropertyTypes | MethodDeclaration | ExportedDeclarations) {
  if ('getJsDocs' in declaration) {
    const jsDocs = declaration.getJsDocs();
    const deprecated = jsDocs
      .map((jsDoc) => jsDoc.getTags())
      .flat()
      .some((e) => e.getTagName() === 'deprecated');
    const comment = jsDocs.map((jsDoc) => jsDoc.getCommentText()).join('\n\n');
    return {
      deprecated,
      description: `${deprecated ? '@deprecated ' : ''}${comment || ''}`,
    };
  }
}

export function getTypeText(declaration: ClassInstancePropertyTypes | MethodDeclaration) {
  const structure = declaration.getStructure();
  return (
    ('type' in structure && typeof structure.type === 'string' && structure.type) || declaration.getType().getText()
  );
}

export function isGetter(
  declaration: ClassInstancePropertyTypes | ClassStaticPropertyTypes,
  kind: 'get' | 'set' = 'get',
) {
  const first = declaration.getFirstChild();
  const firstText = first?.getText();
  return (firstText === 'static' ? first?.getNextSibling()?.getText() : firstText) === kind;
}

export function isSetter(declaration: ClassInstancePropertyTypes | ClassStaticPropertyTypes) {
  return isGetter(declaration, 'set');
}
