// webkit marker arrow bug: https://duoyun-ui.gemjs.org/zh/elements/flow

import { adoptedStyle, customElement, property, part, state, shadow, memo, effect } from '@mantou/gem/lib/decorators';
import { createCSSSheet, createRef, createState, html, svg, TemplateResult } from '@mantou/gem/lib/element';
import { css, styleMap, exportPartsMap } from '@mantou/gem/lib/utils';
import { useDecoratorTheme } from '@mantou/gem/helper/theme';
import type { ElkNode, ElkExtendedEdge, ElkEdgeSection, LayoutOptions, ElkShape, ElkPoint } from 'elkjs';
import ELK from 'elkjs/lib/elk.bundled.js';

import { Modify, isNullish, isNotNullish } from '../lib/types';
import { formatToPrecision } from '../lib/number';
import { theme } from '../lib/theme';
import { utf8ToB64 } from '../lib/encode';

import { DuoyunResizeBaseElement } from './base/resize';

const elk = new ELK();

// https://github.com/reaviz/reaflow/blob/master/src/layout/elkLayout.ts
const defaultLayout: LayoutOptions = {
  /**
   * Select a specific layout algorithm.
   *
   * Uses "layered" strategy.
   * It emphasizes the direction of edges by pointing as many edges as possible into the same direction.
   * The nodes are arranged in layers, which are sometimes called “hierarchies”,
   * and then reordered such that the number of edge crossings is minimized.
   * Afterwards, concrete coordinates are computed for the nodes and edge bend points.
   *
   * @see https://www.eclipse.org/elk/reference/algorithms.html
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-algorithm.html
   * @see https://www.eclipse.org/elk/reference/algorithms/org-eclipse-elk-layered.html
   */
  'elk.algorithm': 'org.eclipse.elk.layered',

  /**
   * Hints for where node labels are to be placed; if empty, the node label’s position is not modified.
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-nodeLabels-placement.html
   */
  'elk.nodeLabels.placement': 'OUTSIDE V_TOP H_LEFT',
  /**
   * The minimal distance to be preserved between a label and the edge it is associated with. Note that the placement of a label is influenced by the ‘edgelabels.placement’ option.
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-spacing-edgeLabel.html
   */
  'org.eclipse.elk.spacing.edgeLabel': '8',
  /**
   * Method to decide on edge label sides.
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-layered-edgeLabels-sideSelection.html
   */
  'org.eclipse.elk.layered.edgeLabels.sideSelection': 'ALWAYS_UP',

  /**
   * Overall direction of edges: horizontal (right / left) or vertical (down / up).
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-direction.html
   */
  'elk.direction': 'DOWN',

  /**
   * Strategy for node layering.
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-layered-layering-strategy.html
   */
  'org.eclipse.elk.layered.layering.strategy': 'INTERACTIVE',

  /**
   * What kind of edge routing style should be applied for the content of a parent node.
   * Algorithms may also set this option to single edges in order to mark them as splines.
   * The bend point list of edges with this option set to SPLINES
   * must be interpreted as control points for a piecewise cubic spline.
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-edgeRouting.html
   */
  'org.eclipse.elk.edgeRouting': 'SPLINES',

  /**
   * Adds bend points even if an edge does not change direction.
   * If true, each long edge dummy will contribute a bend point to its edges
   * and hierarchy-crossing edges will always get a bend point where they cross hierarchy boundaries.
   * By default, bend points are only added where an edge changes direction.
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-layered-unnecessaryBendpoints.html
   */
  'elk.layered.unnecessaryBendpoints': 'true',

  /**
   * The spacing to be preserved between nodes and edges that are routed next to the node’s layer.
   * For the spacing between nodes and edges that cross the node’s layer ‘spacing.edgeNode’ is used.
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-layered-spacing-edgeNodeBetweenLayers.html
   */
  'elk.layered.spacing.edgeNodeBetweenLayers': '50',

  /**
   * Tells the BK node placer to use a certain alignment (out of its four)
   * instead of the one producing the smallest height, or the combination of all four.
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-layered-nodePlacement-bk-fixedAlignment.html
   */
  'org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',

  /**
   * Strategy for cycle breaking.
   *
   * Cycle breaking looks for cycles in the graph and determines which edges to reverse to break the cycles.
   * Reversed edges will end up pointing to the opposite direction of regular edges
   * (that is, reversed edges will point left if edges usually point right).
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-layered-cycleBreaking-strategy.html
   */
  'org.eclipse.elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',

  /**
   * Whether this node allows to route self loops inside of it instead of around it.
   *
   * If set to true, this will make the node a compound node if it isn’t already,
   * and will require the layout algorithm to support compound nodes with hierarchical ports.
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-insideSelfLoops-activate.html
   */
  'org.eclipse.elk.insideSelfLoops.activate': 'true',

  /**
   * Whether each connected component should be processed separately.
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-separateConnectedComponents.html
   */
  separateConnectedComponents: 'false',

  /**
   * Spacing to be preserved between pairs of connected components.
   * This option is only relevant if ‘separateConnectedComponents’ is activated.
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-spacing-componentComponent.html
   */
  'spacing.componentComponent': '70',

  /**
   * TODO: Should be spacing.baseValue?
   * An optional base value for all other layout options of the ‘spacing’ group.
   * It can be used to conveniently alter the overall ‘spaciousness’ of the drawing.
   * Whenever an explicit value is set for the other layout options, this base value will have no effect.
   * The base value is not inherited, i.e. it must be set for each hierarchical node.
   *
   * @see https://www.eclipse.org/elk/reference/groups/org-eclipse-elk-layered-spacing.html
   */
  spacing: '75',

  /**
   * The spacing to be preserved between any pair of nodes of two adjacent layers.
   * Note that ‘spacing.nodeNode’ is used for the spacing between nodes within the layer itself.
   *
   * @see https://www.eclipse.org/elk/reference/options/org-eclipse-elk-layered-spacing-nodeNodeBetweenLayers.html
   */
  'spacing.nodeNodeBetweenLayers': '70',
};

export type EdgeSection = Modify<
  ElkEdgeSection,
  {
    d?: string;
  }
>;

export type Edge = Modify<
  ElkExtendedEdge,
  {
    data?: any;
    sections?: EdgeSection[];
    label?: string;
    source?: string;
    target?: string;
    sources?: string[];
    targets?: string[];
  }
>;

export type Node = Modify<
  ElkNode,
  {
    data?: any;
    label?: string;
    children?: Node[];
    edges?: Edge[];
  }
>;

const [elementTheme, updateTheme] = useDecoratorTheme({ opacity: 0, width: '', height: '' });

const canvasStyle = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: block;
    position: relative;
    flex-shrink: 0;
    opacity: ${elementTheme.opacity};
    width: ${elementTheme.width};
    height: ${elementTheme.height};
  }
  .node {
    height: 100%;
    border: 1px solid;
    box-sizing: border-box;
    padding: 0.5em 1em;
    border-radius: ${theme.normalRound};
  }
  .node-label,
  .edge-label {
    font-size: 0.875em;
    color: ${theme.describeColor};
  }
  .edge-label {
    background: ${theme.backgroundColor};
  }
  .edge {
    stroke: currentColor;
    stroke-width: 1;
    fill: none;
  }
`);

/**
 * @customElement dy-flow-canvas
 */
@customElement('dy-flow-canvas')
@adoptedStyle(canvasStyle)
@shadow()
export class DuoyunFlowCanvasElement extends DuoyunResizeBaseElement {
  @part static node: string;
  @part static nodeLabel: string;
  @part static edge: string;
  @part static edgeLabel: string;

  @property resizeThrottle = false;
  @property graph?: Node;
  @property layout?: LayoutOptions;
  @property renderEdge?: (section: EdgeSection, edge: Edge) => TemplateResult;
  @property renderEdgeLabel?: (label: string | undefined, edge: Edge) => string | TemplateResult;
  @property renderNode?: (data: any, node: Node) => string | TemplateResult;
  @property renderNodeLabel?: (label: string | undefined, node: Node) => string | TemplateResult;
  @property renderEndMarker?: () => undefined | TemplateResult;
  @property renderStartMarker?: () => undefined | TemplateResult;

  get #isReady() {
    const node = this.graph?.children?.[0];
    if (!node) return true;
    return !!node.width && !!this.graph?.width;
  }

  #renderNode = (data: any, node: Node) => {
    return this.renderNode
      ? this.renderNode(data, node)
      : html`<div class="node" part=${DuoyunFlowCanvasElement.node}>${data}</div>`;
  };

  #renderNodeLabel = (label: string | undefined, edge: Edge) => {
    return this.renderNodeLabel
      ? this.renderNodeLabel(label, edge)
      : html`<div class="node-label" part=${DuoyunFlowCanvasElement.nodeLabel}>${label}</div>`;
  };

  #renderEdge = (section: EdgeSection, edge: Edge) => {
    return this.renderEdge
      ? this.renderEdge(section, edge)
      : svg`
          <path
            class="edge"
            part=${DuoyunFlowCanvasElement.edge}
            d=${section.d || ''}
            marker-start="url(#startmarker)"
            marker-end="url(#endmarker)">
          </path>
        `;
  };

  #renderEdgeLabel = (label: string | undefined, edge: Edge) => {
    return this.renderEdgeLabel
      ? this.renderEdgeLabel(label, edge)
      : html`<div class="edge-label" part=${DuoyunFlowCanvasElement.edgeLabel}>${label}</div>`;
  };

  #renderEndMarker = () => {
    return this.renderEndMarker
      ? this.renderEndMarker()
      : svg`
          <marker id="endmarker" viewBox="0 0 10 10"
            refX="10" refY="5"
            markerUnits="strokeWidth"
            markerWidth="10" markerHeight="10"
            orient="auto">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor"/>
          </marker>
        `;
  };

  #renderStartMarker = () => {
    return this.renderStartMarker ? this.renderStartMarker() : undefined;
  };

  #genId = (str: string) => utf8ToB64(str || '.', true);

  #genLabelId = (parentId: string, id: string | number) => this.#genId(`label-${parentId}-${id}`);

  #initShape = (id: string, node: ElkShape) => {
    const ele = this.shadowRoot?.querySelector('#' + id);
    if (ele) {
      const { width, height } = ele.getBoundingClientRect();
      node.width = width;
      node.height = height;
    }
  };

  #updateSize = () => {
    const { children, edges } = this.graph || {};
    children?.forEach((node) => {
      this.#initShape(this.#genId(node.id), node);
      node.labels?.forEach((label, index) => {
        this.#initShape(this.#genLabelId(node.id, index), label);
      });
    });
    edges?.forEach((edge) => {
      this.#initShape(this.#genId(edge.id), edge);
    });
    this.update();
  };

  #distance = (p1: ElkPoint, p2: ElkPoint) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

  #sortPoints = (points: ElkPoint[]) => {
    const start = points[0];
    return points.sort((a, b) => {
      return this.#distance(a, start) - this.#distance(b, start);
    });
  };

  #calcPath = (node?: Node): void => {
    node?.edges?.forEach((edge) => {
      edge.sections?.forEach((section) => {
        const { startPoint, bendPoints, endPoint } = section;
        const joinPoint = (point: ElkPoint) => `${point.x + node!.x!},${point.y + node!.y!}`;
        if (!bendPoints) {
          section.d = `M${joinPoint(startPoint)}L${joinPoint(endPoint)}`;
          return;
        }
        switch (node!.layoutOptions?.['org.eclipse.elk.edgeRouting']) {
          case 'ORTHOGONAL': {
            const bend = bendPoints.map((point) => `L${joinPoint(point)}`).join('');
            section.d = `M${joinPoint(startPoint)}${bend || ''}L${joinPoint(endPoint)}`;
            break;
          }
          default: {
            const precision = node!.width! > 1500 ? 0 : 1;
            const points = [startPoint, ...bendPoints, endPoint]
              .map((e) => ({ x: formatToPrecision(e.x, precision), y: formatToPrecision(e.y, precision) }))
              .filter((e, i, arr) => {
                if (i === arr.length - 1) return true;
                const nextPoint = arr[i + 1];
                const isEqNextPoint = joinPoint(e) === joinPoint(nextPoint);
                if (isEqNextPoint) return false;
                if (i === 0) return true;
                const prevPoint = arr[i - 1];
                const nextDiffY = nextPoint.y - e.y;
                const nextDiffX = nextPoint.x - e.x;
                const prevDiffY = e.y - prevPoint.y;
                const prevDiffX = e.x - prevPoint.x;
                const isPointInLine = nextDiffY / nextDiffX === prevDiffY / prevDiffX;
                const isSomeDirection =
                  Math.sign(nextDiffY) === Math.sign(prevDiffY) && Math.sign(nextDiffX) === Math.sign(prevDiffX);
                return !isSomeDirection || !isPointInLine;
              });
            if (points.length === 3) {
              const controlPoint = joinPoint(points[1]);
              section.d = `M${joinPoint(points[0])}C${controlPoint} ${controlPoint} ${joinPoint(points[2])}`;
            } else if (points.length > 3 && (points.length - 5) % 3 === 0) {
              const start = points.shift()!;
              const end = points.pop()!;
              let c = '';
              for (let i = 0; i < points.length; i += 3) {
                const [_, f, center] = this.#sortPoints([start, ...points.slice(i, i + 3), end]);
                c += ` ${joinPoint(f)} ${joinPoint(center)}C${joinPoint(points[i + 2])} `;
              }
              section.d = `M${joinPoint(start)}C${joinPoint(start)}${c}${joinPoint(end)} ${joinPoint(end)}`;
            } else {
              this.#sortPoints(points);
              const controlPoint = joinPoint(points[1]);
              const end = points[points.length - 1];
              section.d = `M${joinPoint(points[0])}C${controlPoint} ${controlPoint} ${joinPoint(end)}`;
            }
          }
        }
      });
    });
    node?.children?.forEach(this.#calcPath);
  };

  #layout = async () => {
    try {
      await elk.layout(this.graph as any, { layoutOptions: { ...defaultLayout, ...(this.layout || {}) } });
    } catch (err) {
      //
    }
    this.#calcPath(this.graph);
    this.update();
  };

  #renderWrap = (id: string, { width, height, x = 0, y = 0 }: ElkShape, children: TemplateResult | string) => {
    return html`
      <div
        id=${id}
        style=${styleMap({
          position: 'absolute',
          width: width ? `${width}px` : 'auto',
          height: height ? `${height}px` : 'auto',
          left: `${x}px`,
          top: `${y}px`,
        })}
      >
        ${children}
      </div>
    `;
  };

  #renderChildren = (node: Node): TemplateResult => {
    return html`
      ${this.#renderWrap(
        this.#genId(node.id),
        node,
        html`
          <!-- children -->
          ${node.children?.map(this.#renderChildren)}
          <!-- node -->
          ${this.#renderNode(node.data || node.id, node)}
          <!-- label -->
          ${node.labels?.map((label, index) =>
            this.#renderWrap(this.#genLabelId(node.id, index), label, this.#renderNodeLabel(label.text, node)),
          )}
        `,
      )}
    `;
  };

  #renderChildrenEdge = (node: Node): TemplateResult => {
    return html`
      <!-- parent -->
      ${node.edges?.map((edge) => edge.sections?.map((section) => this.#renderEdge(section, edge)))}
      <!-- children -->
      ${node.children?.map((childrenNode) => this.#renderChildrenEdge(childrenNode))}
    `;
  };

  @effect()
  #update = async () => {
    if (this.#isReady) return;
    if (isNullish(this.graph?.children?.[0]?.width)) {
      this.#updateSize();
    } else {
      await this.#layout();
    }
  };

  @updateTheme()
  #theme = () => {
    const { width, height } = this.graph || {};
    return {
      opacity: this.#isReady ? 1 : 0,
      width: width ? `${width}px` : '100%',
      height: height ? `${height}px` : '100%',
    };
  };

  render = () => {
    if (!this.graph) return html``;
    const { children, edges, width, height } = this.graph;
    return html`
      <!-- edge -->
      ${width && height
        ? svg`
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
              <defs>
                ${this.#renderEndMarker()}
                ${this.#renderStartMarker()}
              </defs>
              ${this.#renderChildrenEdge(this.graph)}
            </svg>
          `
        : ''}
      <!-- node -->
      ${children?.map(this.#renderChildren)}
      <!-- edge labels -->
      ${edges?.map(
        (edge) =>
          html`${edge.labels?.map((label, index) =>
            this.#renderWrap(this.#genLabelId(edge.id, index), label, this.#renderEdgeLabel(label.text, edge)),
          )}`,
      )}
    `;
  };
}

type State = {
  scale?: number;
  marginBlock?: number;
};

const style = createCSSSheet(css`
  :host(:where(:not([hidden]))) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`);

/**
 * @customElement dy-flow
 */
@customElement('dy-flow')
@adoptedStyle(style)
@shadow()
export class DuoyunFlowElement extends DuoyunResizeBaseElement {
  @part static node: string;
  @part static nodeLabel: string;
  @part static edge: string;
  @part static edgeLabel: string;

  @property graph?: any;
  @property layout?: LayoutOptions;
  @property renderEdge?: (section: EdgeSection, edge: Edge) => TemplateResult;
  @property renderEdgeLabel?: (label: string | undefined, edge: Edge) => string | TemplateResult;
  @property renderNode?: (data: any, node: Node) => string | TemplateResult;
  @property renderNodeLabel?: (label: string | undefined, node: Node) => string | TemplateResult;
  @property renderEndMarker?: () => undefined | TemplateResult;

  @state loaded: boolean;

  #canvasRef = createRef<DuoyunFlowCanvasElement>();

  #state = createState<State>({});

  #setScale = ({ width }: DuoyunFlowCanvasElement['contentRect']) => {
    const rect = this.getBoundingClientRect();
    const scale = Math.min(formatToPrecision(rect.width / width), 1);
    this.#state({
      scale,
      marginBlock: ((scale - 1) / 2) * rect.height,
    });
  };

  #onCanvasResize = (evt: CustomEvent) => {
    const { contentRect } = evt.target as DuoyunFlowCanvasElement;
    if (contentRect.width && contentRect.height && !this.loaded) {
      this.#setScale(contentRect);
    }
  };

  #normalizeGraph = () => {
    const graph: Node = this.graph;
    if (!graph) return;
    const setLabels = (e: Node | Edge) => {
      if (e.label) e.labels = [{ id: '', text: e.label }];
      if ('children' in e) e.children?.forEach((n) => setLabels(n));
    };
    graph.children?.forEach((e) => setLabels(e));
    graph.edges?.forEach((e) => {
      setLabels(e);
      if (isNotNullish(e.source)) e.sources = [e.source];
      if (isNotNullish(e.target)) e.targets = [e.target];
      if (!e.sources) throw new Error('must have `source` or `sources`');
      if (!e.targets) throw new Error('must have `target` or `targets`');
    });
  };

  @memo((i) => [i.graph])
  #updateState = () => {
    this.#state({ scale: undefined, marginBlock: undefined });
    this.#normalizeGraph();
  };

  @effect((i) => [i.contentRect.width])
  #updateScale = () => {
    if (!this.loaded) return;
    this.#setScale(this.#canvasRef.element!.contentRect);
  };

  #exportparts = exportPartsMap({
    [DuoyunFlowCanvasElement.node]: DuoyunFlowElement.node,
    [DuoyunFlowCanvasElement.nodeLabel]: DuoyunFlowElement.nodeLabel,
    [DuoyunFlowCanvasElement.edge]: DuoyunFlowElement.edge,
    [DuoyunFlowCanvasElement.edgeLabel]: DuoyunFlowElement.edgeLabel,
  });

  render = () => {
    const { scale, marginBlock } = this.#state;
    this.loaded = !!scale;
    return html`
      <dy-flow-canvas
        ref=${this.#canvasRef.ref}
        exportparts=${this.#exportparts}
        @resize=${this.#onCanvasResize}
        style=${styleMap({
          transform: scale && `scale(${scale})`,
          marginBlock: scale && `${marginBlock}px`,
          opacity: scale ? 1 : 0,
        })}
        .renderEdge=${this.renderEdge}
        .renderEdgeLabel=${this.renderEdgeLabel}
        .renderNode=${this.renderNode}
        .renderNodeLabel=${this.renderNodeLabel}
        .renderEndMarker=${this.renderEndMarker}
        .graph=${this.graph}
        .layout=${this.layout}
      ></dy-flow-canvas>
    `;
  };
}
