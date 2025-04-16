import { adoptedStyle, customElement, memo, property } from '@mantou/gem/lib/decorators';
import { css, html, svg } from '@mantou/gem/lib/element';

import { theme } from '../lib/theme';
import { DuoyunChartBaseElement } from './base/chart';
import { ChartTooltip } from './chart-tooltip';

export interface SankeyNode {
  id: string;
  label: string;
  value?: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface ProcessedNode extends SankeyNode {
  x: number;
  y: number;
  height: number;
  layer: number;
  sourceLinks: ProcessedLink[];
  targetLinks: ProcessedLink[];
}

interface ProcessedLink extends SankeyLink {
  sourceNode: ProcessedNode;
  targetNode: ProcessedNode;
  path: string;
  width: number;
}

const style = css`
  .node:hover {
    filter: brightness(0.9);
  }
  .link {
    fill: ${theme.textColor};
    opacity: 0.1;

    &:hover {
      opacity: 0.2;
    }
  }
  .label {
    fill: ${theme.textColor};
    pointer-events: none;
  }
`;

@customElement('dy-sankey-chart')
@adoptedStyle(style)
export class DuoyunSankeyChartElement extends DuoyunChartBaseElement {
  @property data?: SankeyData;
  @property nodeWidth = 10;
  @property nodePadding = 5;

  xAxi = null;
  yAxi = null;

  #data = {
    nodes: [] as ProcessedNode[],
    links: [] as ProcessedLink[],
    layers: new Map<number, ProcessedNode[]>(),
    totalLayerValue: 0,
  };

  #onMouseMove = (evt: MouseEvent, node: ProcessedNode, link?: ProcessedLink) => {
    if (!node.sourceLinks.length) return;
    ChartTooltip.open(evt.x, evt.y, {
      values: node.sourceLinks.map((l) => ({
        label: `${l.sourceNode.label} -> ${l.targetNode.label}`,
        value: this.pAxi?.formatter?.(l.value, 0) || String(l.value),
        originValue: l.value,
        color: '',
        highlight: l === link,
      })),
    });
  };

  #onMouseMoveLink = (index: number, evt: MouseEvent) => {
    const link = this.#data.links[index]!;
    this.#onMouseMove(evt, link.sourceNode, link);
  };

  #onMouseOut = () => {
    ChartTooltip.close();
  };

  @memo((i) => [i.data])
  #processData = () => {
    if (!this.data) return;

    const nodes: ProcessedNode[] = this.data.nodes.map((node) => ({
      ...node,
      x: 0,
      y: 0,
      height: 0,
      layer: 0,
      sourceLinks: [],
      targetLinks: [],
    }));

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    const links: ProcessedLink[] = this.data.links.map((link) => {
      const sourceNode = nodeMap.get(link.source)!;
      const targetNode = nodeMap.get(link.target)!;
      return {
        ...link,
        sourceNode,
        targetNode,
        path: '',
        width: 0,
      };
    });

    links.forEach((link) => {
      link.sourceNode.sourceLinks.push(link);
      link.targetNode.targetLinks.push(link);
    });

    const assignLayer = (node: ProcessedNode, layer = 0) => {
      node.layer = Math.max(node.layer, layer);
      node.sourceLinks.forEach((link) => assignLayer(link.targetNode, layer + 1));
    };

    nodes.forEach((node) => {
      if (node.targetLinks.length === 0) {
        assignLayer(node);
      }
    });

    const layers = new Map<number, ProcessedNode[]>();

    nodes.forEach((node) => {
      const list = layers.get(node.layer) || [];
      list.push(node);
      layers.set(node.layer, list);
    });

    // FIXME: 这里假设第一层值最大
    const totalLayerValue = layers
      .get(0)!
      .reduce((p, n) => p + (n.value || n.sourceLinks.reduce((pp, e) => pp + e.value, 0)), 0);

    this.#data = { nodes, links, layers, totalLayerValue };
  };

  @memo((i) => [i.data, i.contentRect.width, i.aspectRatio, i.nodePadding, i.nodeWidth])
  #computeLayout = () => {
    if (!this.contentRect.width) return;
    const { links, layers, totalLayerValue } = this.#data;
    const layerWidth = this._stageWidth / (Math.max(...layers.keys()) + 1);
    const stageHeight = this._stageHeight;
    const heightPercentage = 0.8;

    layers.forEach((list, layer) => {
      const offsetX = 0.4;
      const x = (layer + offsetX) * layerWidth;

      let y = 0;
      list.forEach((node) => {
        const value = Math.max(
          node.value || 0,
          node.sourceLinks.reduce((sum, link) => sum + link.value, 0),
          node.targetLinks.reduce((sum, link) => sum + link.value, 0),
        );
        node.height = (value / totalLayerValue) * stageHeight * heightPercentage;
        node.x = x;
        node.y = y;
        y += node.height + this.nodePadding;
      });
    });

    layers.forEach((list) => {
      const lastNode = list.at(-1)!;
      const gap = stageHeight - (lastNode.y + lastNode.height);
      const offset = gap / 2;
      list.forEach((node) => (node.y += offset));
    });

    const sourceNodeUsedMap = new Map<ProcessedNode, number>();
    const targetNodeUsedMap = new Map<ProcessedNode, number>();

    links.forEach((link) => {
      const { sourceNode, targetNode, value } = link;
      const linkWidth = (value / totalLayerValue) * stageHeight * heightPercentage;
      const sourceNodeUsed = sourceNodeUsedMap.get(sourceNode) || 0;
      const targetNodeUsed = targetNodeUsedMap.get(targetNode) || 0;

      link.width = linkWidth;
      link.path = this.#generateLinkPath(
        sourceNode.x + this.nodeWidth,
        sourceNode.y + sourceNodeUsed,
        targetNode.x,
        targetNode.y + targetNodeUsed,
        linkWidth,
      );

      sourceNodeUsedMap.set(sourceNode, sourceNodeUsed + linkWidth);
      targetNodeUsedMap.set(targetNode, targetNodeUsed + linkWidth);
    });

    this._initViewBox();
  };

  #generateLinkPath = (x0: number, y0: number, x1: number, y1: number, width: number) => {
    const curvature = 0.5;
    const x2 = x0 + (x1 - x0) * curvature;
    const x3 = x1 - (x1 - x0) * curvature;

    return `M ${x0} ${y0}
            C ${x2} ${y0}, ${x3} ${y1}, ${x1} ${y1}
            v ${width}
            C ${x3} ${y1 + width}, ${x2} ${y0 + width}, ${x0} ${y0 + width}
            Z`;
  };

  render = () => {
    if (this.loading) return this._renderLoading();
    if (this.noData) return this._renderNotData();
    if (!this.contentRect.width || !this.data) return html``;

    return svg`
      <svg part=${DuoyunChartBaseElement.chart} xmlns="http://www.w3.org/2000/svg" viewBox=${this._viewBox.join(' ')}>
        ${this.#data.links.map(
          (link, i) => svg`
            <path
              class="link"
              d=${link.path}
              @pointermove=${(evt: PointerEvent) => this.#onMouseMoveLink(i, evt)}
              @pointerout=${this.#onMouseOut}
            />
          `,
        )}
        <g>
          ${this.#data.nodes.map(
            (node, index) => svg`
              <g transform="translate(${node.x},${node.y})">
                <rect
                  class="node"
                  width=${this.nodeWidth}
                  height=${node.height}
                  fill=${this.colors[index % this.colors.length]}
                  @pointermove=${(evt: PointerEvent) => this.#onMouseMove(evt, node)}
                  @pointerout=${this.#onMouseOut}
                />
                <text
                  class="label"
                  dominant-baseline="middle"
                  font-size=${this._getSVGPixel(10)}
                  x=${this.nodeWidth + 3}
                  y=${node.height / 2}
                >
                  ${node.label}
                </text>
              </g>
            `,
          )}
        </g>
      </svg>
    `;
  };
}
