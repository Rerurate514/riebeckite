export type GraphEdge = {
  source: string;
  target: string;
};

export type LinkableGraphNode = {
  slug: string;
  outgoing: string[];
  backlinks: string[];
};

export type GraphLayoutNode = {
  x: number;
  y: number;
  radius: number;
};

export type RadialGraphLayoutOptions = {
  width: number;
  height: number;
  centerSlug: string;
  radiusRatio?: number;
  minNodeRadius?: number;
  maxNodeRadius?: number;
};

export function buildGraphEdges<T extends LinkableGraphNode>(
  nodes: T[],
  visibleSlugs = new Set(nodes.map((node) => node.slug)),
): GraphEdge[] {
  const edges = new Map<string, GraphEdge>();

  for (const node of nodes) {
    for (const target of node.outgoing) {
      if (!visibleSlugs.has(node.slug) || !visibleSlugs.has(target)) continue;
      const key = `${node.slug}\u0000${target}`;
      edges.set(key, { source: node.slug, target });
    }
  }

  return Array.from(edges.values());
}

export function layoutRadialGraph<T extends LinkableGraphNode>(
  nodes: T[],
  options: RadialGraphLayoutOptions,
): Map<string, GraphLayoutNode> {
  const layout = new Map<string, GraphLayoutNode>();
  const centerX = options.width / 2;
  const centerY = options.height / 2;
  const radius =
    Math.min(options.width, options.height) * (options.radiusRatio ?? 0.36);
  const minNodeRadius = options.minNodeRadius ?? 8;
  const maxNodeRadius = options.maxNodeRadius ?? 14;
  const selectedIndex = Math.max(
    nodes.findIndex((node) => node.slug === options.centerSlug),
    0,
  );

  nodes.forEach((node, index) => {
    const shiftedIndex = (index - selectedIndex + nodes.length) % nodes.length;
    const angle = (shiftedIndex / Math.max(nodes.length, 1)) * Math.PI * 2;
    const linkCount = node.outgoing.length + node.backlinks.length;
    const isCenter = node.slug === options.centerSlug;

    layout.set(node.slug, {
      x: isCenter ? centerX : centerX + Math.cos(angle) * radius,
      y: isCenter ? centerY : centerY + Math.sin(angle) * radius,
      radius: clamp(7 + linkCount, minNodeRadius, maxNodeRadius),
    });
  });

  return layout;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
