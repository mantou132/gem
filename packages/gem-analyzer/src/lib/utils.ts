import type {
  ClassInstancePropertyTypes,
  ClassStaticPropertyTypes,
  ExportedDeclarations,
  MethodDeclaration,
} from 'ts-morph';

export function getJsDoc(declaration: ClassInstancePropertyTypes | MethodDeclaration | ExportedDeclarations) {
  if ('getJsDocs' in declaration) {
    const jsDocs = declaration.getJsDocs();
    const deprecated = jsDocs.flatMap((jsDoc) => jsDoc.getTags()).some((e) => e.getTagName() === 'deprecated');
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

export function isPrivateId(name: string) {
  if (name.startsWith('#') || name.startsWith('_')) return true;
}
