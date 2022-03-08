import { adoptedStyle, customElement, property, part } from '@mantou/gem/lib/decorators';
import { GemElement, html, svg, TemplateResult } from '@mantou/gem/lib/element';
import { createCSSSheet, css, styleMap, exportPartsMap } from '@mantou/gem/lib/utils';
import type { ELK, ElkNode, ElkExtendedEdge, ElkEdgeSection, LayoutOptions, ElkShape } from 'elkjs';

import { Modify, isNullish, isNotNullish } from '../lib/types';
import { formatToPrecision } from '../lib/number';
import { theme } from '../lib/theme';
import { utf8ToB64 } from '../lib/encode';

import { DuoyunResizeBaseElement } from './base/resize';

(window as any).g = null;

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
  'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',

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

const canvasStyle = createCSSSheet(css`
  :host {
    display: block;
    position: relative;
    flex-shrink: 0;
  }
  .node {
    border: 1px solid;
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
export class DuoyunFlowCanvasElement extends DuoyunResizeBaseElement {
  @part static node: string;
  @part static nodeLabel: string;
  @part static edge: string;
  @part static edgeLabel: string;

  @property elk?: ELK;
  @property graph?: Node;
  @property layout?: LayoutOptions;
  @property renderEdge?: (section: EdgeSection) => TemplateResult;
  @property renderEdgeLabel?: (label?: string) => string | TemplateResult;
  @property renderNode?: (data: any) => string | TemplateResult;
  @property renderNodeLabel?: (label?: any) => string | TemplateResult;
  @property renderEndMarker?: () => undefined | TemplateResult;
  @property renderStartMarker?: () => undefined | TemplateResult;

  get #isReady() {
    const edges = this.graph?.edges;
    return edges?.length === 0 || edges?.[0]?.sections;
  }

  constructor() {
    super({ throttle: false });
  }

  #renderNode = (data: any) => {
    return this.renderNode
      ? this.renderNode(data)
      : html`<div class="node" part=${DuoyunFlowCanvasElement.node}>${data}</div>`;
  };

  #renderNodeLabel = (label?: string) => {
    return this.renderNodeLabel
      ? this.renderNodeLabel(label)
      : html`<div class="node-label" part=${DuoyunFlowCanvasElement.nodeLabel}>${label}</div>`;
  };

  #renderEdge = (section: EdgeSection) => {
    return this.renderEdge
      ? this.renderEdge(section)
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

  #renderEdgeLabel = (label?: string) => {
    return this.renderEdgeLabel
      ? this.renderEdgeLabel(label)
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

  #genId = (str: string) => utf8ToB64(str || '.').replaceAll('=', '');

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

  #layout = async () => {
    if (!this.graph || !this.elk) return;
    await this.elk.layout(this.graph as any, { layoutOptions: { ...defaultLayout, ...(this.layout || {}) } });
    this.graph.edges?.forEach((edge) => {
      edge.sections?.forEach((section) => {
        const { startPoint, bendPoints, endPoint } = section;
        const bend = bendPoints?.map(({ x, y }) => `L${x} ${y}`).join('');
        section.d = `M${startPoint.x} ${startPoint.y}${bend || ''}L${endPoint.x} ${endPoint.y}`;
      });
    });
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

  mounted = () => {
    this.effect(async () => {
      const node = this.graph?.children?.[0];
      if (!node) return;
      if (this.#isReady) return;
      if (isNullish(node?.width)) {
        this.#updateSize();
      } else {
        try {
          await this.#layout();
        } catch {
          //
        }
      }
    });
  };

  render = () => {
    if (!this.graph) return html``;
    const { children, edges, width, height } = this.graph;
    return html`
      <style>
        :host {
          opacity: ${this.#isReady ? 1 : 0};
          width: ${width ? `${width}px` : '100%'};
          height: ${height ? `${height}px` : '100%'};
        }
      </style>
      ${width && height
        ? svg`
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
              <defs>
                ${this.#renderEndMarker()}
                ${this.#renderStartMarker()}
              </defs>
              ${edges?.map(({ sections }) => sections?.map(this.#renderEdge))}
            </svg>
          `
        : ''}
      ${edges?.map(
        (edge) =>
          html`${edge.labels?.map((label, index) =>
            this.#renderWrap(this.#genLabelId(edge.id, index), label, this.#renderEdgeLabel(label.text)),
          )}`,
      )}
      ${children?.map(
        (node) =>
          html`
            ${this.#renderWrap(
              this.#genId(node.id),
              node,
              html`${this.#renderNode(node.data || node.id)}${node.labels?.map((label, index) =>
                this.#renderWrap(this.#genLabelId(node.id, index), label, this.#renderNodeLabel(label.text)),
              )}`,
            )}
          `,
      )}
    `;
  };
}

type State = {
  elk?: ELK;
  scale?: number;
  marginBlock?: number;
};

const style = createCSSSheet(css`
  :host {
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
export class DuoyunFlowElement extends GemElement<State> {
  @part static node: string;
  @part static nodeLabel: string;
  @part static edge: string;
  @part static edgeLabel: string;

  @property graph?: any;
  @property layout?: LayoutOptions;
  @property renderEdge?: (data: any) => TemplateResult;
  @property renderEdgeLabel?: (label?: string) => string | TemplateResult;
  @property renderNode?: (data: any) => string | TemplateResult;
  @property renderNodeLabel?: (label?: any) => string | TemplateResult;
  @property renderEndMarker?: () => undefined | TemplateResult;

  state: State = {};

  #onCanvasResize = (evt: CustomEvent<DuoyunFlowCanvasElement>) => {
    const { width, height } = evt.detail.contentRect;
    if (width && height) {
      const rect = this.getBoundingClientRect();
      const scale = Math.min(formatToPrecision(rect.width / width), 1);
      this.setState({
        scale,
        marginBlock: ((scale - 1) / 2) * rect.height,
      });
    }
  };

  #normalizeGraph = (graph?: Node) => {
    if (!graph) return;
    const setLabels = (e: Node | Edge) => {
      if (e.label) e.labels = [{ text: e.label }];
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

  willMount = () => {
    this.memo(
      () => {
        this.setState({ scale: undefined, marginBlock: undefined });
        this.#normalizeGraph(this.graph);
      },
      () => [this.graph],
    );
  };

  mounted = () => {
    const url = 'https://cdn.skypack.dev/elkjs@0.7.1';
    import(/* @vite-ignore */ /* webpackIgnore: true */ `${url}?min`).then((module) => {
      const elk: ELK = new module.default();
      this.setState({ elk });
    });
  };

  render = () => {
    const { elk, scale, marginBlock } = this.state;
    return html`
      <dy-flow-canvas
        exportparts=${exportPartsMap({
          [DuoyunFlowCanvasElement.node]: DuoyunFlowCanvasElement.node,
          [DuoyunFlowCanvasElement.nodeLabel]: DuoyunFlowCanvasElement.nodeLabel,
          [DuoyunFlowCanvasElement.edge]: DuoyunFlowCanvasElement.edge,
          [DuoyunFlowCanvasElement.edgeLabel]: DuoyunFlowCanvasElement.edgeLabel,
        })}
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
        .elk=${elk}
        .graph=${this.graph}
        .layout=${this.layout}
      ></dy-flow-canvas>
    `;
  };
}
