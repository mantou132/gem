import type { SourceFile, ClassDeclaration } from 'ts-morph';
import { camelToKebabCase } from '@mantou/gem/lib/utils';

interface StaticProperty {
  name: string;
  slot?: string;
  part?: string;
  type?: string;
  description?: string;
}

interface StaticMethod {
  name: string;
  type?: string;
  description?: string;
}

interface Property {
  name: string;
  reactive: boolean;
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
      description:
        staticPropDeclaration
          .getJsDocs()
          .map((jsDoc) => jsDoc.getCommentText())
          .join('\n\n') || undefined,
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
      description:
        staticMethodDeclaration
          .getJsDocs()
          .map((jsDoc) => jsDoc.getCommentText())
          .join('\n\n') || undefined,
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
      description:
        ('getJsDocs' in propDeclaration &&
          propDeclaration
            .getJsDocs()
            .map((jsDoc) => jsDoc.getCommentText())
            .join('\n\n')) ||
        undefined,
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
      description:
        methodDeclaration
          .getJsDocs()
          .map((jsDoc) => jsDoc.getCommentText())
          .join('\n\n') || undefined,
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
    const elementDeclaration = declaration
      .getDecorators()
      .find((decorator) => elementDecoratorName.includes(decorator.getName()));
    if (elementDeclaration) {
      const detail = {
        ...parseElement(declaration),
        name: elementDeclaration
          .getCallExpression()!
          .getArguments()[0]
          .getText()
          .replace(/('|"|`)?(\S*)\1/, '$2'),
      };
      if (!detail.constructorName.startsWith('_')) {
        result.push(detail);
      }
    }
  }
  return result;
};
