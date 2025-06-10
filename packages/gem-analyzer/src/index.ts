import { camelToKebabCase } from '@mantou/gem/lib/utils';
import type { ClassDeclaration, Project, SourceFile } from 'ts-morph';

import { getJsDoc, getTypeText, isGetter, isPrivateId, isSetter } from './lib/utils';

interface StaticProperty {
  getter?: boolean;
  setter?: boolean;
  name: string;
  deprecated?: boolean;
  slot?: string;
  part?: string;
  type?: string;
  description?: string;
}

interface StaticMethod {
  name: string;
  deprecated?: boolean;
  type?: string;
  description?: string;
}

interface Property {
  getter?: boolean;
  setter?: boolean;
  name: string;
  reactive: boolean;
  deprecated?: boolean;
  attribute?: string;
  slot?: string;
  part?: string;
  cssState?: string;
  isRef?: boolean;
  event?: string;
  isGlobalEvent?: boolean;
  type?: string;
  description?: string;
}

interface Method {
  name: string;
  deprecated?: boolean;
  event?: string;
  isGlobalEvent?: boolean;
  type?: string;
  description?: string;
}

interface ConstructorParam {
  name: string;
  type?: string;
  description?: string;
}

export interface ElementDetail {
  relativePath?: string;
  shadow: boolean;
  name: string;
  constructorName: string;
  constructorExtendsName: string;
  constructorParams: ConstructorParam[];
  staticProperties: StaticProperty[];
  staticMethods: StaticMethod[];
  properties: Property[];
  methods: Method[];
  description?: string;
  attributes: string[];
  events: string[];
  slots: string[];
  parts: string[];
  cssStates: string[];
  extend?: ElementDetail;
}

const shadowDecoratorName = ['shadow'];
const elementDecoratorName = ['customElement'];
const attrDecoratorName = ['attribute', 'boolattribute', 'numattribute'];
const propDecoratorName = ['property'];
const stateDecoratorName = ['state'];
const slotDecoratorName = ['slot'];
const partDecoratorName = ['part'];
const refDecoratorName = ['refobject'];
const eventDecoratorName = ['emitter', 'globalemitter'];
const globalEventDecoratorName = ['globalemitter'];
const lifecyclePopsOrMethods = ['state', 'willMount', 'render', 'mounted', 'shouldUpdate', 'updated', 'unmounted'];

async function getExtendsClassDetail(className: string, sourceFile: SourceFile, project?: Project) {
  if (className === 'GemElement') return;
  const currentFile = sourceFile.getFilePath();
  const isAbsFilePath = currentFile.startsWith('/');
  if (!isAbsFilePath || !project) return;
  const fileSystem = project.getFileSystem();
  const importDeclaration = sourceFile.getImportDeclaration(
    (desc) =>
      !!desc
        .getNamedImports()
        .map((e) => e.getText())
        .find((e) => e.includes(className)),
  );
  if (!importDeclaration) return;
  const depPath = importDeclaration.getModuleSpecifierValue();
  if (!depPath.startsWith('.')) return;
  const { pathname } = new URL(`${depPath}.ts`, `gem:${currentFile}`);
  if (project.getSourceFile(pathname)) return;
  project.createSourceFile(pathname, '');
  try {
    const text = await fileSystem.readFile(pathname);
    const file = project.createSourceFile(pathname, text, { overwrite: true });
    const classDeclaration = file.getClass(className);
    if (!classDeclaration) return;
    const detail = await parseElement(classDeclaration, file, project);
    detail.relativePath = depPath;
    return detail;
  } catch {
    return;
  }
}

export const parseElement = async (declaration: ClassDeclaration, file: SourceFile, project?: Project) => {
  const detail: ElementDetail = {
    name: '',
    shadow: false,
    constructorName: '',
    constructorExtendsName: '',
    constructorParams: [],
    staticProperties: [],
    staticMethods: [],
    properties: [],
    methods: [],
    attributes: [],
    cssStates: [],
    events: [],
    parts: [],
    slots: [],
  };
  const className = declaration.getName();
  const constructorExtendsName = declaration.getExtends()?.getText();
  const cons = declaration.getConstructors()[0];
  const appendElementDesc = (desc = '') =>
    (detail.description = (detail.description ? `${detail.description}\n\n` : '') + desc);
  declaration.getJsDocs().forEach((jsDoc) => appendElementDesc(jsDoc.getCommentText()));

  if (className && constructorExtendsName) {
    detail.extend = await getExtendsClassDetail(constructorExtendsName, file, project);
    detail.constructorName = className;
    detail.constructorExtendsName = constructorExtendsName;
    if (cons) {
      const params: Record<string, string> = {};
      const jsDocs = cons.getJsDocs();
      jsDocs.forEach((jsDoc) => {
        appendElementDesc(jsDoc.getDescription());
        jsDoc
          .getTags()
          .map((tag) => ({ tagName: tag.getTagName(), name: (tag as any).getName(), comment: tag.getCommentText() }))
          .filter(({ tagName, comment, name }) => tagName === 'param' && comment && name)
          .forEach(({ name, comment }) => {
            params[name] = comment!;
          });
      });
      detail.constructorParams = cons.getParameters().map((param) => ({
        name: param.getName(),
        type: getTypeText(param),
        description: params[param.getName()],
      }));
    }
  }

  const staticPropertiesDeclarations = declaration.getStaticProperties();
  for (const staticPropDeclaration of staticPropertiesDeclarations) {
    const staticPropName = staticPropDeclaration.getName();
    if (isPrivateId(staticPropName)) continue;
    const prop: StaticProperty = {
      name: staticPropName,
      type: staticPropDeclaration.getType().getText(),
      getter: isGetter(staticPropDeclaration),
      setter: isSetter(staticPropDeclaration),
      ...getJsDoc(staticPropDeclaration),
    };

    let isPartOrSlot = false;

    const staticPropDecorators = staticPropDeclaration.getDecorators();
    for (const decorator of staticPropDecorators) {
      const decoratorName = decorator.getName();
      if (slotDecoratorName.includes(decoratorName)) {
        isPartOrSlot = true;
        prop.slot = camelToKebabCase(staticPropName);
        detail.slots.push(prop.slot);
      } else if (partDecoratorName.includes(decoratorName)) {
        isPartOrSlot = true;
        prop.part = camelToKebabCase(staticPropName);
        detail.parts.push(prop.part);
      }
    }

    if (!isPartOrSlot) {
      detail.staticProperties.push(prop);
    }
  }

  const staticMethodDeclarations = declaration.getStaticMethods();
  for (const staticMethodDeclaration of staticMethodDeclarations) {
    const staticMethodName = staticMethodDeclaration.getName();
    if (isPrivateId(staticMethodName)) continue;
    const method: StaticMethod = {
      name: staticMethodName,
      type: staticMethodDeclaration.getType().getText(),
      ...getJsDoc(staticMethodDeclaration),
    };
    detail.staticMethods.push(method);
  }

  const propDeclarations = declaration.getInstanceProperties();
  for (const propDeclaration of propDeclarations) {
    const propName = propDeclaration.getName();
    if (isPrivateId(propName)) continue;
    if (lifecyclePopsOrMethods.includes(propName)) continue;
    const prop: Property = {
      name: propName,
      reactive: false,
      type: getTypeText(propDeclaration),
      getter: isGetter(propDeclaration),
      setter: isSetter(propDeclaration),
      ...getJsDoc(propDeclaration),
    };
    detail.properties.push(prop);

    const propDecorators = propDeclaration.getDecorators();
    for (const decorator of propDecorators) {
      const decoratorName = decorator.getName();
      if (attrDecoratorName.includes(decoratorName)) {
        prop.reactive = true;
        prop.attribute = camelToKebabCase(propName);
        detail.attributes.push(prop.attribute);
      } else if (propDecoratorName.includes(decoratorName)) {
        prop.reactive = true;
      } else if (stateDecoratorName.includes(decoratorName)) {
        prop.cssState = camelToKebabCase(propName);
        detail.cssStates.push(prop.cssState);
      } else if (slotDecoratorName.includes(decoratorName)) {
        prop.slot = camelToKebabCase(propName);
        detail.slots.push(prop.slot);
      } else if (partDecoratorName.includes(decoratorName)) {
        prop.part = camelToKebabCase(propName);
        detail.parts.push(prop.part);
      } else if (refDecoratorName.includes(decoratorName)) {
        prop.isRef = true;
      } else if (eventDecoratorName.includes(decoratorName)) {
        prop.event = camelToKebabCase(propName);
        detail.events.push(prop.event);
      }
      if (globalEventDecoratorName.includes(decoratorName)) {
        prop.isGlobalEvent = true;
      }
    }
  }

  const methodDeclarations = declaration.getInstanceMethods();
  for (const methodDeclaration of methodDeclarations) {
    const methodName = methodDeclaration.getName();
    if (isPrivateId(methodName)) continue;
    if (lifecyclePopsOrMethods.includes(methodName)) continue;
    const method: Method = {
      name: methodName,
      type: getTypeText(methodDeclaration),
      ...getJsDoc(methodDeclaration),
    };
    detail.methods.push(method);

    const methodDecorators = methodDeclaration.getDecorators();
    for (const decorator of methodDecorators) {
      const decoratorName = decorator.getName();
      if (eventDecoratorName.includes(decoratorName)) {
        method.event = camelToKebabCase(methodName);
        detail.events.push(method.event);
      }
      if (globalEventDecoratorName.includes(decoratorName)) {
        method.isGlobalEvent = true;
      }
    }
  }

  const elementDecorators = declaration.getDecorators();
  const shadowDeclaration = elementDecorators.find((decorator) => shadowDecoratorName.includes(decorator.getName()));
  if (shadowDeclaration) {
    detail.shadow = true;
  }

  return detail;
};

export const getElements = async (file: SourceFile, project?: Project) => {
  const result: ElementDetail[] = [];
  for (const declaration of file.getClasses()) {
    // need support other decorators?
    const elementDecorators = declaration.getDecorators();
    const elementDeclaration = elementDecorators.find((decorator) =>
      elementDecoratorName.includes(decorator.getName()),
    );
    const elementTag =
      elementDeclaration
        ?.getCallExpression()!
        .getArguments()[0]
        .getText()
        .replace(/('|"|`)?(\S*)\1/, '$2') ||
      declaration
        .getJsDocs()
        .flatMap((jsDoc) => jsDoc.getTags())
        .find((e) => e.getTagName() === 'customElement')
        ?.getCommentText();
    if (elementTag) {
      const detail: ElementDetail = {
        ...(await parseElement(declaration, file, project)),
        name: elementTag,
      };
      if (!detail.constructorName.startsWith('_')) {
        result.push(detail);
      }
    }
  }
  return result;
};

export interface ExportDetail {
  name: string;
  kindName: string;
  type: string;
  deprecated?: boolean;
  description?: string;
}

export const getExports = async (file: SourceFile) => {
  const result: ExportDetail[] = [];

  for (const [name, declarations] of file.getExportedDeclarations()) {
    // reexport
    if (!declarations.length) return;
    let deprecated = false;
    let description = '';
    declarations.forEach((declaration) => {
      // 只支持 1 份有效的 jsDoc
      const jsDoc = getJsDoc(declaration);
      if (jsDoc?.deprecated || jsDoc?.description) {
        deprecated = jsDoc.deprecated;
        description = jsDoc.description;
      }
    });

    result.push({
      name,
      kindName: declarations[0].getKindName(),
      type: declarations
        .map((declaration) => declaration.getType().getText())
        .filter((e) => !!e)
        .join(';'),
      deprecated,
      description,
    });
  }
  return result;
};
