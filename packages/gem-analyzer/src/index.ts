import type { SourceFile, ClassDeclaration } from 'ts-morph';
import { camelToKebabCase } from '@mantou/gem/lib/utils';

import { getJsDoc } from './lib/utils';

interface StaticProperty {
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

export const parseElement = (declaration: ClassDeclaration) => {
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
  const constructor = declaration.getConstructors()[0];
  const appendElementDesc = (desc = '') =>
    (detail.description = (detail.description ? detail.description + '\n\n' : '') + desc);
  declaration.getJsDocs().forEach((jsDoc) => appendElementDesc(jsDoc.getCommentText()));

  if (className && constructorExtendsName) {
    detail.constructorName = className;
    detail.constructorExtendsName = constructorExtendsName;
    if (constructor) {
      const params: Record<string, string> = {};
      const jsDocs = constructor.getJsDocs();
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
      detail.constructorParams = constructor.getParameters().map((param) => ({
        name: param.getName(),
        type: param.getType().getText(),
        description: params[param.getName()],
      }));
    }
  }

  const staticPropertiesDeclarations = declaration.getStaticProperties();
  for (const staticPropDeclaration of staticPropertiesDeclarations) {
    const staticPropName = staticPropDeclaration.getName();
    if (staticPropName.startsWith('#')) continue;
    const prop: StaticProperty = {
      name: staticPropName,
      type: staticPropDeclaration.getType().getText(),
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
    if (staticMethodName.startsWith('#')) continue;
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
    if (propName.startsWith('#')) continue;
    if (lifecyclePopsOrMethods.includes(propName)) continue;
    const prop: Property = {
      name: propName,
      reactive: false,
      type: propDeclaration.getType().getText(),
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
    if (methodName.startsWith('#')) continue;
    if (lifecyclePopsOrMethods.includes(methodName)) continue;
    const method: Method = {
      name: methodName,
      type: methodDeclaration.getType().getText(),
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
  return detail;
};

export const getElements = (file: SourceFile) => {
  const result: ElementDetail[] = [];
  for (const declaration of file.getClasses()) {
    // need support other decorators?
    const elementDecorators = declaration.getDecorators();
    const elementDeclaration = elementDecorators.find((decorator) =>
      elementDecoratorName.includes(decorator.getName()),
    );
    const shadowDeclaration = elementDecorators.find((decorator) => shadowDecoratorName.includes(decorator.getName()));
    const elementTag =
      elementDeclaration
        ?.getCallExpression()!
        .getArguments()[0]
        .getText()
        .replace(/('|"|`)?(\S*)\1/, '$2') ||
      declaration
        .getJsDocs()
        .map((jsDoc) => jsDoc.getTags())
        .flat()
        .find((e) => e.getTagName() === 'customElement')
        ?.getCommentText();
    if (elementTag) {
      const detail: ElementDetail = {
        ...parseElement(declaration),
        name: elementTag,
        shadow: !!shadowDeclaration,
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

export const getExports = (file: SourceFile) => {
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
