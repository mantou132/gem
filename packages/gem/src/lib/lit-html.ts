/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * TemplateResult change to classes
 * Use `null`/`undefined` instead `nothing`, no export `noChange`
 * Built-in ref & rest props`
 * Remove compiled template result
 * Remove sanitizer
 * Remove debug log event
 * Remove warning log
 */

import type { TrustedTypesWindow } from 'trusted-types/lib';

import type { Directive, DirectiveResult, PartInfo } from './directive';

const global = globalThis;

const trustedTypes = (global as unknown as TrustedTypesWindow).trustedTypes;

const policy = trustedTypes?.createPolicy('lit-html', {
  createHTML: (s: string) => s,
});

// Added to an attribute name to mark the attribute as bound so we can find
// it easily.
const boundAttributeSuffix = '$lit$';

// This marker is used in many syntactic positions in HTML, so it must be
// a valid element name and attribute name. We don't support dynamic names (yet)
// but this at least ensures that the parse tree is closer to the template
// intention.
const marker = `lit$${Math.random().toFixed(9).slice(2)}$`;

// String used to tell if a comment is a marker comment
const markerMatch = '?' + marker;

// Text used to insert a comment marker node. We use processing instruction
// syntax because it's slightly smaller, but parses as a comment node.
const nodeMarker = `<${markerMatch}>`;

const d = document;

// Creates a dynamic marker. We never have to search for these in the DOM.
const createMarker = () => d.createComment('');

// https://tc39.github.io/ecma262/#sec-typeof-operator
type Primitive = null | undefined | boolean | number | string | symbol | bigint;
const isPrimitive = (value: unknown): value is Primitive =>
  value === null || (typeof value != 'object' && typeof value != 'function');
const isNullish = (value: unknown) => value === null || value === undefined;
const isIterable = (value: any): value is Iterable<unknown> => Symbol.iterator in value;

const SPACE_CHAR = `[ \t\n\f\r]`;
const ATTR_VALUE_CHAR = `[^ \t\n\f\r"'\`<>=]`;
const NAME_CHAR = `[^\\s"'>=/]`;

// These regexes represent the five parsing states that we care about in the
// Template's HTML scanner. They match the *end* of the state they're named
// after.
// Depending on the match, we transition to a new state. If there's no match,
// we stay in the same state.
// Note that the regexes are stateful. We utilize lastIndex and sync it
// across the multiple regexes used. In addition to the five regexes below
// we also dynamically create a regex to find the matching end tags for raw
// text elements.

/**
 * End of text is: `<` followed by:
 *   (comment start) or (tag) or (dynamic tag binding)
 */
const textEndRegex = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
const COMMENT_START = 1;
const TAG_NAME = 2;
const DYNAMIC_TAG_NAME = 3;

const commentEndRegex = /-->/g;
/**
 * Comments not started with <!--, like </{, can be ended by a single `>`
 */
const comment2EndRegex = />/g;

/**
 * The tagEnd regex matches the end of the "inside an opening" tag syntax
 * position. It either matches a `>`, an attribute-like sequence, or the end
 * of the string after a space (attribute-name position ending).
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#elements-attributes
 *
 * " \t\n\f\r" are HTML space characters:
 * https://infra.spec.whatwg.org/#ascii-whitespace
 *
 * So an attribute is:
 *  * The name: any character except a whitespace character, ("), ('), ">",
 *    "=", or "/". Note: this is different from the HTML spec which also excludes control characters.
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const tagEndRegex = new RegExp(
  `>|${SPACE_CHAR}(?:(${NAME_CHAR}+)(${SPACE_CHAR}*=${SPACE_CHAR}*(?:${ATTR_VALUE_CHAR}|("|')|))|$)`,
  'g',
);
const ENTIRE_MATCH = 0;
const ATTRIBUTE_NAME = 1;
const SPACES_AND_EQUALS = 2;
const QUOTE_CHAR = 3;

const singleQuoteAttrEndRegex = /'/g;
const doubleQuoteAttrEndRegex = /"/g;
/**
 * Matches the raw text elements.
 *
 * Comments are not parsed within raw text elements, so we need to search their
 * text content for marker strings.
 */
const rawTextElement = /^(?:script|style|textarea|title)$/i;

// TemplatePart types
// IMPORTANT: these must match the values in PartType
const ATTRIBUTE_PART = 1;
const CHILD_PART = 2;
const PROPERTY_PART = 3;
const BOOLEAN_ATTRIBUTE_PART = 4;
const EVENT_PART = 5;
const ELEMENT_PART = 6;
const COMMENT_PART = 7;

enum ResultType {
  HTML,
  SVG,
  MATHML,
}

export class TemplateResult {
  type: ResultType;
  strings: TemplateStringsArray;
  values: unknown[];
  constructor(type: ResultType, strings: TemplateStringsArray, values: unknown[]) {
    this.type = type;
    this.strings = strings;
    this.values = values;
  }
}

const tag =
  <T extends ResultType>(type: T) =>
  (strings: TemplateStringsArray, ...values: unknown[]) => {
    return new TemplateResult(type, strings, values);
  };

export const html = tag(ResultType.HTML);
export const svg = tag(ResultType.SVG);
export const mathml = tag(ResultType.MATHML);

// for directive
export const noChange = Symbol.for('lit-noChange');

const templateCache = new WeakMap<TemplateStringsArray, Template>();

/**
 * Object specifying options for controlling lit-html rendering. Note that
 * while `render` may be called multiple times on the same `container` (and
 * `renderBefore` reference node) to efficiently update the rendered content,
 * only the options passed in during the first render are respected during
 * the lifetime of renders to that unique `container` + `renderBefore`
 * combination.
 */
export interface RenderOptions {
  /**
   * An object to use as the `this` value for event listeners. It's often
   * useful to set this to the host component rendering a template.
   */
  host?: object;
  /**
   * A DOM node before which to render content in the container.
   */
  renderBefore?: ChildNode | null;
  /**
   * Node used for cloning the template (`importNode` will be called on this
   * node). This controls the `ownerDocument` of the rendered DOM, along with
   * any inherited context. Defaults to the global `document`.
   */
  creationScope?: { importNode(node: Node, deep?: boolean): Node };
  /**
   * The initial connected state for the top-level part being rendered. If no
   * `isConnected` option is set, `AsyncDirective`s will be connected by
   * default. Set to `false` if the initial render occurs in a disconnected tree
   * and `AsyncDirective`s should see `isConnected === false` for their initial
   * render. The `part.setConnected()` method must be used subsequent to initial
   * render to change the connected state of the part.
   */
  isConnected?: boolean;
}

const walker = d.createTreeWalker(d, 129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */);

//
// Classes only below here, const variable declarations only above here...
//
// Keeping variable declarations and classes together improves minification.
// Interfaces and type aliases can be interleaved freely.
//

// Type for classes that have a `_directive` or `_directives[]` field, used by
// `resolveDirective`
export interface DirectiveParent {
  _$parent?: DirectiveParent;
  _$isConnected: boolean;
  __directive?: Directive;
  __directives?: Array<Directive | undefined>;
}

function trustFromTemplateString(tsa: TemplateStringsArray, stringFromTSA: string): TrustedHTML {
  if (!Array.isArray(tsa)) throw new Error('invalid template');
  return policy !== undefined ? policy.createHTML(stringFromTSA) : (stringFromTSA as unknown as TrustedHTML);
}

/**
 * Returns an HTML string for the given TemplateStringsArray and result type
 * (HTML or SVG), along with the case-sensitive bound attribute names in
 * template order. The HTML contains comment markers denoting the `ChildPart`s
 * and suffixes on bound attributes denoting the `AttributeParts`.
 *
 * @param strings template strings array
 * @param type HTML or SVG
 * @return Array containing `[html, attrNames]` (array returned for terseness,
 *     to avoid object fields since this code is shared with non-minified SSR
 *     code)
 */
const getTemplateHtml = (strings: TemplateStringsArray, type: ResultType): [TrustedHTML, Array<string>] => {
  // Insert makers into the template HTML to represent the position of
  // bindings. The following code scans the template strings to determine the
  // syntactic position of the bindings. They can be in text position, where
  // we insert an HTML comment, attribute value position, where we insert a
  // sentinel string and re-write the attribute name, or inside a tag where
  // we insert the sentinel string.
  const l = strings.length - 1;
  // Stores the case-sensitive bound attribute names in the order of their
  // parts. ElementParts are also reflected in this array as undefined
  // rather than a string, to disambiguate from attribute bindings.
  const attrNames: Array<string> = [];
  let htmlStr = type === ResultType.SVG ? '<svg>' : type === ResultType.MATHML ? '<math>' : '';

  // When we're inside a raw text tag (not it's text content), the regex
  // will still be tagRegex so we can find attributes, but will switch to
  // this regex when the tag ends.
  let rawTextEndRegex: RegExp | undefined;

  // The current parsing state, represented as a reference to one of the
  // regexes
  let regex = textEndRegex;

  for (let i = 0; i < l; i++) {
    const s = strings[i];
    // The index of the end of the last attribute name. When this is
    // positive at end of a string, it means we're in an attribute value
    // position and need to rewrite the attribute name.
    // We also use a special value of -2 to indicate that we encountered
    // the end of a string in attribute name position.
    let attrNameEndIndex = -1;
    let attrName: string | undefined;
    let lastIndex = 0;
    let match!: RegExpExecArray | null;

    // The conditions in this loop handle the current parse state, and the
    // assignments to the `regex` variable are the state transitions.
    while (lastIndex < s.length) {
      // Make sure we start searching from where we previously left off
      regex.lastIndex = lastIndex;
      match = regex.exec(s);
      if (match === null) {
        break;
      }
      lastIndex = regex.lastIndex;
      if (regex === textEndRegex) {
        if (match[COMMENT_START] === '!--') {
          regex = commentEndRegex;
        } else if (match[COMMENT_START] !== undefined) {
          // We started a weird comment, like </{
          regex = comment2EndRegex;
        } else if (match[TAG_NAME] !== undefined) {
          if (rawTextElement.test(match[TAG_NAME])) {
            // Record if we encounter a raw-text element. We'll switch to
            // this regex at the end of the tag.
            rawTextEndRegex = new RegExp(`</${match[TAG_NAME]}`, 'g');
          }
          regex = tagEndRegex;
        } else if (match[DYNAMIC_TAG_NAME] !== undefined) {
          regex = tagEndRegex;
        }
      } else if (regex === tagEndRegex) {
        if (match[ENTIRE_MATCH] === '>') {
          // End of a tag. If we had started a raw-text element, use that
          // regex
          regex = rawTextEndRegex ?? textEndRegex;
          // We may be ending an unquoted attribute value, so make sure we
          // clear any pending attrNameEndIndex
          attrNameEndIndex = -1;
        } else if (match[ATTRIBUTE_NAME] === undefined) {
          // Attribute name position
          attrNameEndIndex = -2;
        } else {
          attrNameEndIndex = regex.lastIndex - match[SPACES_AND_EQUALS].length;
          attrName = match[ATTRIBUTE_NAME];
          regex =
            match[QUOTE_CHAR] === undefined
              ? tagEndRegex
              : match[QUOTE_CHAR] === '"'
                ? doubleQuoteAttrEndRegex
                : singleQuoteAttrEndRegex;
        }
      } else if (regex === doubleQuoteAttrEndRegex || regex === singleQuoteAttrEndRegex) {
        regex = tagEndRegex;
      } else if (regex === commentEndRegex || regex === comment2EndRegex) {
        regex = textEndRegex;
      } else {
        // Not one of the five state regexes, so it must be the dynamically
        // created raw text regex and we're at the close of that element.
        regex = tagEndRegex;
        rawTextEndRegex = undefined;
      }
    }

    // We have four cases:
    //  1. We're in text position, and not in a raw text element
    //     (regex === textEndRegex): insert a comment marker.
    //  2. We have a non-negative attrNameEndIndex which means we need to
    //     rewrite the attribute name to add a bound attribute suffix.
    //  3. We're at the non-first binding in a multi-binding attribute, use a
    //     plain marker.
    //  4. We're somewhere else inside the tag. If we're in attribute name
    //     position (attrNameEndIndex === -2), add a sequential suffix to
    //     generate a unique attribute name.

    // Detect a binding next to self-closing tag end and insert a space to
    // separate the marker from the tag end:
    const end = regex === tagEndRegex && strings[i + 1].startsWith('/>') ? ' ' : '';
    htmlStr +=
      regex === textEndRegex
        ? s + nodeMarker
        : attrNameEndIndex >= 0
          ? (attrNames.push(attrName!),
            s.slice(0, attrNameEndIndex) + boundAttributeSuffix + s.slice(attrNameEndIndex)) +
            marker +
            end
          : s + marker + (attrNameEndIndex === -2 ? i : end);
  }

  const htmlResult: string | TrustedHTML =
    htmlStr +
    (strings[l] || '<?>') +
    (type === ResultType.SVG ? '</svg>' : type === ResultType.MATHML ? '</math>' : '');

  // Returned as an array for terseness
  return [trustFromTemplateString(strings, htmlResult), attrNames];
};

/** @internal */
export type { Template };
class Template {
  /** @internal */
  el!: HTMLTemplateElement;
  parts: Array<TemplatePart> = [];

  constructor({ strings, type }: TemplateResult, options?: RenderOptions) {
    let node: Node | null;
    let nodeIndex = 0;
    let attrNameIndex = 0;
    const partCount = strings.length - 1;
    const parts = this.parts;

    // Create template element
    const [trustedHtml, attrNames] = getTemplateHtml(strings, type);
    this.el = Template.createElement(trustedHtml, options);
    walker.currentNode = this.el.content;

    // Re-parent SVG or MathML nodes into template root
    if (type === ResultType.SVG || type === ResultType.MATHML) {
      const wrapper = this.el.content.firstChild!;
      wrapper.replaceWith(...wrapper.childNodes);
    }

    // Walk the template to find binding markers and create TemplateParts
    while ((node = walker.nextNode()) !== null && parts.length < partCount) {
      if (node.nodeType === 1) {
        // TODO (justinfagnani): for attempted dynamic tag names, we don't
        // increment the bindingIndex, and it'll be off by 1 in the element
        // and off by two after it.
        if ((node as Element).hasAttributes()) {
          for (const name of (node as Element).getAttributeNames()) {
            if (name.endsWith(boundAttributeSuffix)) {
              const realName = attrNames[attrNameIndex++];
              const value = (node as Element).getAttribute(name)!;
              const statics = value.split(marker);
              const m = /([.?@])?(.*)/.exec(realName)!;
              parts.push({
                type: ATTRIBUTE_PART,
                index: nodeIndex,
                name: m[2],
                strings: statics,
                ctor:
                  m[1] === '.'
                    ? PropertyPart
                    : m[1] === '?'
                      ? BooleanAttributePart
                      : m[1] === '@'
                        ? EventPart
                        : AttributePart,
              });
              (node as Element).removeAttribute(name);
            } else if (name.startsWith(marker)) {
              parts.push({
                type: ELEMENT_PART,
                index: nodeIndex,
              });
              (node as Element).removeAttribute(name);
            }
          }
        }
        // TODO (justinfagnani): benchmark the regex against testing for each
        // of the 3 raw text element names.
        if (rawTextElement.test((node as Element).tagName)) {
          // For raw text elements we need to split the text content on
          // markers, create a Text node for each segment, and create
          // a TemplatePart for each marker.
          const stringList = (node as Element).textContent!.split(marker);
          const lastIndex = stringList.length - 1;
          if (lastIndex > 0) {
            (node as Element).textContent = trustedTypes ? (trustedTypes.emptyScript as unknown as '') : '';
            // Generate a new text node for each literal section
            // These nodes are also used as the markers for node parts
            // We can't use empty text nodes as markers because they're
            // normalized when cloning in IE (could simplify when
            // IE is no longer supported)
            for (let i = 0; i < lastIndex; i++) {
              (node as Element).append(stringList[i], createMarker());
              // Walk past the marker node we just added
              walker.nextNode();
              parts.push({ type: CHILD_PART, index: ++nodeIndex });
            }
            // Note because this marker is added after the walker's current
            // node, it will be walked to in the outer loop (and ignored), so
            // we don't need to adjust nodeIndex here
            (node as Element).append(stringList[lastIndex], createMarker());
          }
        }
      } else if (node.nodeType === 8) {
        const data = (node as Comment).data;
        if (data === markerMatch) {
          parts.push({ type: CHILD_PART, index: nodeIndex });
        } else {
          let i = -1;
          while ((i = (node as Comment).data.indexOf(marker, i + 1)) !== -1) {
            // Comment node has a binding marker inside, make an inactive part
            // The binding won't work, but subsequent bindings will
            parts.push({ type: COMMENT_PART, index: nodeIndex });
            // Move to the end of the match
            i += marker.length - 1;
          }
        }
      }
      nodeIndex++;
    }
  }

  // Overridden via `litHtmlPolyfillSupport` to provide platform support.
  /** @nocollapse */
  static createElement(trustedHtml: TrustedHTML, _options?: RenderOptions) {
    const el = d.createElement('template');
    el.innerHTML = trustedHtml as unknown as string;
    return el;
  }
}

export interface Disconnectable {
  _$parent?: Disconnectable;
  _$disconnectableChildren?: Set<Disconnectable>;
  // Rather than hold connection state on instances, Disconnectables recursively
  // fetch the connection state from the RootPart they are connected in via
  // getters up the Disconnectable tree via _$parent references. This pushes the
  // cost of tracking the isConnected state to `AsyncDirectives`, and avoids
  // needing to pass all Disconnectables (parts, template instances, and
  // directives) their connection state each time it changes, which would be
  // costly for trees that have no AsyncDirectives.
  _$isConnected: boolean;
}

function resolveDirective(
  part: ChildPart | AttributePart | ElementPart,
  value: unknown,
  parent: DirectiveParent = part,
  attributeIndex?: number,
): unknown {
  // Bail early if the value is explicitly noChange. Note, this means any
  // nested directive is still attached and is not run.
  if (value === noChange) {
    return value;
  }
  let currentDirective =
    attributeIndex !== undefined
      ? (parent as AttributePart).__directives?.[attributeIndex]
      : (parent as ChildPart | ElementPart | Directive).__directive;
  const nextDirectiveConstructor = isPrimitive(value)
    ? undefined
    : // This property needs to remain unminified.
      (value as DirectiveResult)['_$litDirective$'];
  if (currentDirective?.constructor !== nextDirectiveConstructor) {
    // This property needs to remain unminified.
    currentDirective?.['_$notifyDirectiveConnectionChanged']?.(false);
    if (nextDirectiveConstructor === undefined) {
      currentDirective = undefined;
    } else {
      currentDirective = new nextDirectiveConstructor(part as PartInfo);
      currentDirective._$initialize(part, parent, attributeIndex);
    }
    if (attributeIndex !== undefined) {
      ((parent as AttributePart).__directives ??= [])[attributeIndex] = currentDirective;
    } else {
      (parent as ChildPart | Directive).__directive = currentDirective;
    }
  }
  if (currentDirective !== undefined) {
    value = resolveDirective(
      part,
      currentDirective._$resolve(part, (value as DirectiveResult).values),
      currentDirective,
      attributeIndex,
    );
  }
  return value;
}

export type { TemplateInstance };
/**
 * An updateable instance of a Template. Holds references to the Parts used to
 * update the template instance.
 */
class TemplateInstance implements Disconnectable {
  _$template: Template;
  _$parts: Array<Part | undefined> = [];

  /** @internal */
  _$parent: ChildPart;
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  constructor(template: Template, parent: ChildPart) {
    this._$template = template;
    this._$parent = parent;
  }

  // Called by ChildPart parentNode getter
  get parentNode() {
    return this._$parent.parentNode;
  }

  // See comment in Disconnectable interface for why this is a getter
  get _$isConnected() {
    return this._$parent._$isConnected;
  }

  // This method is separate from the constructor because we need to return a
  // DocumentFragment and we don't want to hold onto it with an instance field.
  _clone(options: RenderOptions | undefined) {
    const {
      el: { content },
      parts: parts,
    } = this._$template;
    const fragment = (options?.creationScope ?? d).importNode(content, true);
    walker.currentNode = fragment;

    let node = walker.nextNode()!;
    let nodeIndex = 0;
    let partIndex = 0;
    let templatePart = parts[0];

    while (templatePart !== undefined) {
      if (nodeIndex === templatePart.index) {
        let part: Part | undefined;
        if (templatePart.type === CHILD_PART) {
          part = new ChildPart(node as HTMLElement, node.nextSibling, this, options);
        } else if (templatePart.type === ATTRIBUTE_PART) {
          part = new templatePart.ctor(node as HTMLElement, templatePart.name, templatePart.strings, this, options);
        } else if (templatePart.type === ELEMENT_PART) {
          part = new ElementPart(node as HTMLElement, this, options);
        }
        this._$parts.push(part);
        templatePart = parts[++partIndex];
      }
      if (nodeIndex !== templatePart?.index) {
        node = walker.nextNode()!;
        nodeIndex++;
      }
    }
    // We need to set the currentNode away from the cloned tree so that we
    // don't hold onto the tree even if the tree is detached and should be
    // freed.
    walker.currentNode = d;
    return fragment;
  }

  _update(values: Array<unknown>) {
    let i = 0;
    for (const part of this._$parts) {
      if (part !== undefined) {
        if ((part as AttributePart).strings !== undefined) {
          (part as AttributePart)._$setValue(values, part as AttributePart, i);
          // The number of values the part consumes is part.strings.length - 1
          // since values are in between template spans. We increment i by 1
          // later in the loop, so increment it by part.strings.length - 2 here
          i += (part as AttributePart).strings!.length - 2;
        } else {
          part._$setValue(values[i]);
        }
      }
      i++;
    }
  }
}

/*
 * Parts
 */
type AttributeTemplatePart = {
  readonly type: typeof ATTRIBUTE_PART;
  readonly index: number;
  readonly name: string;
  readonly ctor: typeof AttributePart;
  readonly strings: ReadonlyArray<string>;
};
type ChildTemplatePart = {
  readonly type: typeof CHILD_PART;
  readonly index: number;
};
type ElementTemplatePart = {
  readonly type: typeof ELEMENT_PART;
  readonly index: number;
};
type CommentTemplatePart = {
  readonly type: typeof COMMENT_PART;
  readonly index: number;
};

/**
 * A TemplatePart represents a dynamic part in a template, before the template
 * is instantiated. When a template is instantiated Parts are created from
 * TemplateParts.
 */
type TemplatePart = ChildTemplatePart | AttributeTemplatePart | ElementTemplatePart | CommentTemplatePart;

export type Part = ChildPart | AttributePart | PropertyPart | BooleanAttributePart | ElementPart | EventPart;

export class ChildPart implements Disconnectable {
  readonly type = CHILD_PART;
  readonly options: RenderOptions | undefined;
  _$committedValue: unknown;
  /** @internal */
  __directive?: Directive;
  /** @internal */
  _$startNode: ChildNode;
  /** @internal */
  _$endNode: ChildNode | null;
  /** @internal */
  _$parent: Disconnectable | undefined;
  /**
   * Connection state for RootParts only (i.e. ChildPart without _$parent
   * returned from top-level `render`). This field is unused otherwise. The
   * intention would be clearer if we made `RootPart` a subclass of `ChildPart`
   * with this field (and a different _$isConnected getter), but the subclass
   * caused a perf regression, possibly due to making call sites polymorphic.
   * @internal
   */
  __isConnected: boolean;

  // See comment in Disconnectable interface for why this is a getter
  get _$isConnected() {
    // ChildParts that are not at the root should always be created with a
    // parent; only RootChildNode's won't, so they return the local isConnected
    // state
    return this._$parent?._$isConnected ?? this.__isConnected;
  }

  // The following fields will be patched onto ChildParts when required by
  // AsyncDirective
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;
  /** @internal */
  _$notifyConnectionChanged?(isConnected: boolean, removeFromParent?: boolean, from?: number): void;
  /** @internal */
  _$reparentDisconnectables?(parent: Disconnectable): void;

  constructor(
    startNode: ChildNode,
    endNode: ChildNode | null,
    parent: TemplateInstance | ChildPart | undefined,
    options: RenderOptions | undefined,
  ) {
    this._$startNode = startNode;
    this._$endNode = endNode;
    this._$parent = parent;
    this.options = options;
    // Note __isConnected is only ever accessed on RootParts (i.e. when there is
    // no _$parent); the value on a non-root-part is "don't care", but checking
    // for parent would be more code
    this.__isConnected = options?.isConnected ?? true;
  }

  /**
   * The parent node into which the part renders its content.
   *
   * A ChildPart's content consists of a range of adjacent child nodes of
   * `.parentNode`, possibly bordered by 'marker nodes' (`.startNode` and
   * `.endNode`).
   *
   * - If both `.startNode` and `.endNode` are non-null, then the part's content
   * consists of all siblings between `.startNode` and `.endNode`, exclusively.
   *
   * - If `.startNode` is non-null but `.endNode` is null, then the part's
   * content consists of all siblings following `.startNode`, up to and
   * including the last child of `.parentNode`. If `.endNode` is non-null, then
   * `.startNode` will always be non-null.
   *
   * - If both `.endNode` and `.startNode` are null, then the part's content
   * consists of all child nodes of `.parentNode`.
   */
  get parentNode(): Node {
    let parentNode: Node = this._$startNode.parentNode!;
    const parent = this._$parent;
    if (parent !== undefined && parentNode?.nodeType === 11 /* Node.DOCUMENT_FRAGMENT */) {
      // If the parentNode is a DocumentFragment, it may be because the DOM is
      // still in the cloned fragment during initial render; if so, get the real
      // parentNode the part will be committed into by asking the parent.
      parentNode = (parent as ChildPart | TemplateInstance).parentNode;
    }
    return parentNode;
  }

  /**
   * The part's leading marker node, if any. See `.parentNode` for more
   * information.
   */
  get startNode(): Node | null {
    return this._$startNode;
  }

  /**
   * The part's trailing marker node, if any. See `.parentNode` for more
   * information.
   */
  get endNode(): Node | null {
    return this._$endNode;
  }

  _$setValue(value: unknown, directiveParent: DirectiveParent = this) {
    // This `ChildPart` has no `parentNode` and therefore cannot accept a value.
    // This likely means the element containing the part was manipulated in an
    // unsupported way outside of Lit's control such that the part's marker
    // nodes were ejected from DOM. For example, setting the element's
    // `innerHTML` or `textContent` can do this.
    if (!this.parentNode) return;
    value = resolveDirective(this, value, directiveParent);
    if (isPrimitive(value)) {
      // Non-rendering child values. It's important that these do not render
      // empty text nodes to avoid issues with preventing default <slot>
      // fallback content.
      if (isNullish(value) || value === '') {
        if (!isNullish(this._$committedValue)) {
          this._$clear();
        }
        this._$committedValue = undefined;
      } else if (value !== this._$committedValue && value !== noChange) {
        this._commitText(value);
      }
    } else if (value instanceof TemplateResult) {
      this._commitTemplateResult(value);
    } else if ((value as Node).nodeType !== undefined) {
      this._commitNode(value as Node);
    } else if (isIterable(value)) {
      this._commitIterable(value);
    } else {
      // Fallback, will render the string representation
      this._commitText(value);
    }
  }

  private _insert<T extends Node>(node: T) {
    return this._$startNode.parentNode!.insertBefore(node, this._$endNode);
  }

  private _commitNode(value: Node) {
    if (this._$committedValue !== value) {
      this._$clear();
      this._$committedValue = this._insert(value);
    }
  }

  private _commitText(value: unknown) {
    // If the committed value is a primitive it means we called _commitText on
    // the previous render, and we know that this._$startNode.nextSibling is a
    // Text node. We can now just replace the text content (.data) of the node.
    if (!isNullish(this._$committedValue) && isPrimitive(this._$committedValue)) {
      const node = this._$startNode.nextSibling as Text;
      (node as Text).data = value as string;
    } else {
      this._commitNode(d.createTextNode(value as string));
    }
    this._$committedValue = value;
  }

  private _commitTemplateResult(result: TemplateResult) {
    const { values } = result;
    const template: Template = this._$getTemplate(result);

    if ((this._$committedValue as TemplateInstance)?._$template === template) {
      (this._$committedValue as TemplateInstance)._update(values);
    } else {
      const instance = new TemplateInstance(template as Template, this);
      const fragment = instance._clone(this.options);
      instance._update(values);
      this._commitNode(fragment);
      this._$committedValue = instance;
    }
  }

  // Overridden via `litHtmlPolyfillSupport` to provide platform support.
  /** @internal */
  _$getTemplate(result: TemplateResult) {
    let template = templateCache.get(result.strings);
    if (template === undefined) {
      templateCache.set(result.strings, (template = new Template(result)));
    }
    return template;
  }

  private _commitIterable(value: Iterable<unknown>) {
    // For an Iterable, we create a new InstancePart per item, then set its
    // value to the item. This is a little bit of overhead for every item in
    // an Iterable, but it lets us recurse easily and efficiently update Arrays
    // of TemplateResults that will be commonly returned from expressions like:
    // array.map((i) => html`${i}`), by reusing existing TemplateInstances.

    // If value is an array, then the previous render was of an
    // iterable and value will contain the ChildParts from the previous
    // render. If value is not an array, clear this part and make a new
    // array for ChildParts.
    if (!Array.isArray(this._$committedValue)) {
      this._$committedValue = [];
      this._$clear();
    }

    // Lets us keep track of how many items we stamped so we can clear leftover
    // items from a previous render
    const itemParts = this._$committedValue as ChildPart[];
    let partIndex = 0;
    let itemPart: ChildPart | undefined;

    for (const item of value) {
      if (partIndex === itemParts.length) {
        // If no existing part, create a new one
        // TODO (justinfagnani): test perf impact of always creating two parts
        // instead of sharing parts between nodes
        // https://github.com/lit/lit/issues/1266
        itemParts.push(
          (itemPart = new ChildPart(this._insert(createMarker()), this._insert(createMarker()), this, this.options)),
        );
      } else {
        // Reuse an existing part
        itemPart = itemParts[partIndex];
      }
      itemPart._$setValue(item);
      partIndex++;
    }

    if (partIndex < itemParts.length) {
      // itemParts always have end nodes
      this._$clear(itemPart && itemPart._$endNode!.nextSibling, partIndex);
      // Truncate the parts array so _value reflects the current state
      itemParts.length = partIndex;
    }
  }

  /**
   * Removes the nodes contained within this Part from the DOM.
   *
   * @param start Start node to clear from, for clearing a subset of the part's
   *     DOM (used when truncating iterables)
   * @param from  When `start` is specified, the index within the iterable from
   *     which ChildParts are being removed, used for disconnecting directives in
   *     those Parts.
   *
   * @internal
   */
  _$clear(start: ChildNode | null = this._$startNode.nextSibling, from?: number) {
    this._$notifyConnectionChanged?.(false, true, from);
    while (start && start !== this._$endNode) {
      const n = start!.nextSibling;
      (start! as Element).remove();
      start = n;
    }
  }
  /**
   * Implementation of RootPart's `isConnected`. Note that this method
   * should only be called on `RootPart`s (the `ChildPart` returned from a
   * top-level `render()` call). It has no effect on non-root ChildParts.
   * @param isConnected Whether to set
   * @internal
   */
  setConnected(isConnected: boolean) {
    if (this._$parent === undefined) {
      this.__isConnected = isConnected;
      this._$notifyConnectionChanged?.(isConnected);
    }
  }
}

/**
 * A top-level `ChildPart` returned from `render` that manages the connected
 * state of `AsyncDirective`s created throughout the tree below it.
 */
export interface RootPart extends ChildPart {
  /**
   * Sets the connection state for `AsyncDirective`s contained within this root
   * ChildPart.
   *
   * lit-html does not automatically monitor the connectedness of DOM rendered;
   * as such, it is the responsibility of the caller to `render` to ensure that
   * `part.setConnected(false)` is called before the part object is potentially
   * discarded, to ensure that `AsyncDirective`s have a chance to dispose of
   * any resources being held. If a `RootPart` that was previously
   * disconnected is subsequently re-connected (and its `AsyncDirective`s should
   * re-connect), `setConnected(true)` should be called.
   *
   * @param isConnected Whether directives within this tree should be connected
   * or not
   */
  setConnected(isConnected: boolean): void;
}

export type { AttributePart };
class AttributePart implements Disconnectable {
  readonly type: typeof ATTRIBUTE_PART | typeof PROPERTY_PART | typeof BOOLEAN_ATTRIBUTE_PART | typeof EVENT_PART =
    ATTRIBUTE_PART;
  readonly element: HTMLElement;
  readonly name: string;
  readonly options: RenderOptions | undefined;

  /**
   * If this attribute part represents an interpolation, this contains the
   * static strings of the interpolation. For single-value, complete bindings,
   * this is undefined.
   */
  readonly strings?: ReadonlyArray<string>;
  /** @internal */
  _$committedValue: unknown | Array<unknown>;
  /** @internal */
  __directives?: Array<Directive | undefined>;
  /** @internal */
  _$parent: Disconnectable;
  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  get tagName() {
    return this.element.tagName;
  }

  // See comment in Disconnectable interface for why this is a getter
  get _$isConnected() {
    return this._$parent._$isConnected;
  }

  constructor(
    element: HTMLElement,
    name: string,
    strings: ReadonlyArray<string>,
    parent: Disconnectable,
    options: RenderOptions | undefined,
  ) {
    this.element = element;
    this.name = name;
    this._$parent = parent;
    this.options = options;
    if (strings.length > 2 || strings[0] !== '' || strings[1] !== '') {
      this._$committedValue = new Array(strings.length - 1).fill(new String());
      this.strings = strings;
    } else {
      this._$committedValue = undefined;
    }
  }

  /**
   * Sets the value of this part by resolving the value from possibly multiple
   * values and static strings and committing it to the DOM.
   * If this part is single-valued, `this._strings` will be undefined, and the
   * method will be called with a single value argument. If this part is
   * multi-value, `this._strings` will be defined, and the method is called
   * with the value array of the part's owning TemplateInstance, and an offset
   * into the value array from which the values should be read.
   * This method is overloaded this way to eliminate short-lived array slices
   * of the template instance values, and allow a fast-path for single-valued
   * parts.
   *
   * @param value The part value, or an array of values for multi-valued parts
   * @param valueIndex the index to start reading values from. `undefined` for
   *   single-valued parts
   * @param noCommit causes the part to not commit its value to the DOM. Used
   *   in hydration to prime attribute parts with their first-rendered value,
   *   but not set the attribute, and in SSR to no-op the DOM operation and
   *   capture the value for serialization.
   *
   * @internal
   */
  _$setValue(
    value: unknown | Array<unknown>,
    directiveParent: DirectiveParent = this,
    valueIndex?: number,
    noCommit?: boolean,
  ) {
    const strings = this.strings;

    // Whether any of the values has changed, for dirty-checking
    let change = false;

    if (strings === undefined) {
      // Single-value binding case
      value = resolveDirective(this, value, directiveParent, 0);
      change = !isPrimitive(value) || value !== this._$committedValue;
      if (change) {
        this._$committedValue = value;
      }
    } else {
      // Interpolation case
      const values = value as Array<unknown>;
      value = strings[0];

      let i, v;
      for (i = 0; i < strings.length - 1; i++) {
        v = resolveDirective(this, values[valueIndex! + i], directiveParent, i);
        change ||= !isPrimitive(v) || v !== (this._$committedValue as Array<unknown>)[i];
        if (isNullish(v)) {
          value = undefined;
        } else if (!isNullish(value)) {
          value += v + strings[i + 1];
        }
        (this._$committedValue as Array<unknown>)[i] = v;
      }
    }
    if (change && !noCommit) {
      this._commitValue(value);
    }
  }

  /** @internal */
  _commitValue(value: unknown) {
    if (isNullish(value)) {
      (this.element as Element).removeAttribute(this.name);
    } else {
      (this.element as Element).setAttribute(this.name, value as string);
    }
  }
}

export type { PropertyPart };
class PropertyPart extends AttributePart {
  override readonly type = PROPERTY_PART;

  /** @internal */
  override _commitValue(value: unknown) {
    (this.element as any)[this.name] = value;
  }
}

export type { BooleanAttributePart };
class BooleanAttributePart extends AttributePart {
  override readonly type = BOOLEAN_ATTRIBUTE_PART;

  /** @internal */
  override _commitValue(value: unknown) {
    (this.element as Element).toggleAttribute(this.name, !!value);
  }
}

type EventListenerWithOptions = EventListenerOrEventListenerObject & Partial<AddEventListenerOptions>;

export type { EventPart };
class EventPart extends AttributePart {
  override readonly type = EVENT_PART;

  constructor(
    element: HTMLElement,
    name: string,
    strings: ReadonlyArray<string>,
    parent: Disconnectable,
    options: RenderOptions | undefined,
  ) {
    super(element, name, strings, parent, options);
  }

  /** @internal */
  override _$setValue(newListener: unknown, directiveParent: DirectiveParent = this) {
    newListener = resolveDirective(this, newListener, directiveParent, 0);
    const oldListener = this._$committedValue;

    const shouldRemoveListener =
      oldListener &&
      (!newListener ||
        (newListener as EventListenerWithOptions).capture !== (oldListener as EventListenerWithOptions).capture ||
        (newListener as EventListenerWithOptions).once !== (oldListener as EventListenerWithOptions).once ||
        (newListener as EventListenerWithOptions).passive !== (oldListener as EventListenerWithOptions).passive);

    const shouldAddListener = newListener && (!oldListener || shouldRemoveListener);

    if (shouldRemoveListener) {
      this.element.removeEventListener(this.name, this, oldListener as EventListenerWithOptions);
    }
    if (shouldAddListener) {
      this.element.addEventListener(this.name, this, newListener as EventListenerWithOptions);
    }
    this._$committedValue = newListener;
  }

  handleEvent(event: Event) {
    if (typeof this._$committedValue === 'function') {
      this._$committedValue.call(this.options?.host ?? this.element, event);
    } else {
      (this._$committedValue as EventListenerObject).handleEvent(event);
    }
  }
}

export type { ElementPart };
class ElementPart implements Disconnectable {
  readonly type = ELEMENT_PART;

  /** @internal */
  __directive?: Directive;

  // This is to ensure that every Part has a _$committedValue
  _$committedValue: undefined;

  /** @internal */
  _$parent!: Disconnectable;

  /** @internal */
  _$disconnectableChildren?: Set<Disconnectable> = undefined;

  _$props: any;

  options: RenderOptions | undefined;

  constructor(
    public element: Element,
    parent: Disconnectable,
    options: RenderOptions | undefined,
  ) {
    this._$parent = parent;
    this.options = options;
  }

  // See comment in Disconnectable interface for why this is a getter
  get _$isConnected() {
    return this._$parent._$isConnected;
  }

  _$setValue(value: unknown) {
    if (!value) return;
    if (value instanceof Ref) {
      value.value = this.element;
    } else if ((value as DirectiveResult)['_$litDirective$']) {
      resolveDirective(this, value);
    } else {
      if (this._$props) {
        for (const prop in this._$props) {
          Reflect.set(this.element, prop, undefined);
        }
      }
      Object.assign(this.element, value);
      this._$props = value;
    }
  }
}

export const createRef = <T = Element>() => new Ref<T>();

export type { Ref };
class Ref<T = Element> {
  value?: T;
}

export const render = (
  value: unknown,
  container: HTMLElement | DocumentFragment,
  options?: RenderOptions,
): RootPart => {
  const partOwnerNode = (options?.renderBefore ?? container) as any;
  let part: ChildPart = partOwnerNode['_$litPart$'];
  if (part === undefined) {
    const endNode = options?.renderBefore ?? null;
    partOwnerNode['_$litPart$'] = part = new ChildPart(
      container.insertBefore(createMarker(), endNode),
      endNode,
      undefined,
      options ?? {},
    );
  }
  part._$setValue(value);
  return part as RootPart;
};
