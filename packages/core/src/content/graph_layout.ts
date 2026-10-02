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

export type ForceGraphLayoutOptions = {
  width: number;
  height: number;
  centerSlug?: string;
  linkDistance?: number;
  repulsion?: number;
  iterations?: number;
  damping?: number;
  minNodeRadius?: number;
  maxNodeRadius?: number;
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

export function layoutForceGraph<T extends LinkableGraphNode>(
  nodes: T[],
  options: ForceGraphLayoutOptions,
): Map<string, GraphLayoutNode> {
  const safeOptions = resolveForceGraphLayoutOptions(options);
  const layoutNodes = [...nodes].sort((a, b) => a.slug.localeCompare(b.slug));
  const layout = createInitialLayout(layoutNodes, safeOptions);
  const visibleSlugs = new Set(layoutNodes.map((node) => node.slug));
  const edges = buildGraphEdges(layoutNodes, visibleSlugs).filter(
    (edge) => edge.source !== edge.target,
  );
  const velocities = new Map(
    layoutNodes.map((node) => [node.slug, { x: 0, y: 0 }]),
  );
  const centerX = safeOptions.width / 2;
  const centerY = safeOptions.height / 2;

  for (let iteration = 0; iteration < safeOptions.iterations; iteration++) {
    const alpha = 1 - iteration / safeOptions.iterations;
    applyRepulsion(
      layoutNodes,
      layout,
      velocities,
      safeOptions.repulsion * alpha,
    );
    applyLinks(edges, layout, velocities, safeOptions.linkDistance, alpha);
    applyCentering(layoutNodes, layout, velocities, centerX, centerY, alpha);
    integrate(
      layoutNodes,
      layout,
      velocities,
      safeOptions,
      safeOptions.damping,
    );
  }

  return layout;
}

type ResolvedForceGraphLayoutOptions = Required<
  Omit<ForceGraphLayoutOptions, "centerSlug">
> & {
  centerSlug?: string;
};

function resolveForceGraphLayoutOptions(
  options: ForceGraphLayoutOptions,
): ResolvedForceGraphLayoutOptions {
  const minNodeRadius = clampFinite(options.minNodeRadius ?? 8, 1, 64);
  const maxNodeRadius = Math.max(
    minNodeRadius,
    clampFinite(options.maxNodeRadius ?? 14, minNodeRadius, 96),
  );
  return {
    width: clampFinite(options.width, maxNodeRadius * 2, 20_000),
    height: clampFinite(options.height, maxNodeRadius * 2, 20_000),
    centerSlug: options.centerSlug,
    linkDistance: clampFinite(options.linkDistance ?? 84, 1, 2_000),
    repulsion: clampFinite(options.repulsion ?? 1_800, 0, 100_000),
    iterations: Math.round(clampFinite(options.iterations ?? 160, 0, 1_000)),
    damping: clampFinite(options.damping ?? 0.82, 0, 1),
    minNodeRadius,
    maxNodeRadius,
  };
}

function createInitialLayout<T extends LinkableGraphNode>(
  nodes: T[],
  options: ForceGraphLayoutOptions,
): Map<string, GraphLayoutNode> {
  return layoutRadialGraph(nodes, {
    width: options.width,
    height: options.height,
    centerSlug: options.centerSlug ?? nodes[0]?.slug ?? "",
    radiusRatio: 0.28,
    minNodeRadius: options.minNodeRadius,
    maxNodeRadius: options.maxNodeRadius,
  });
}

function applyRepulsion<T extends LinkableGraphNode>(
  nodes: T[],
  layout: Map<string, GraphLayoutNode>,
  velocities: Map<string, { x: number; y: number }>,
  strength: number,
) {
  for (let sourceIndex = 0; sourceIndex < nodes.length; sourceIndex++) {
    for (
      let targetIndex = sourceIndex + 1;
      targetIndex < nodes.length;
      targetIndex++
    ) {
      const source = layout.get(nodes[sourceIndex]?.slug ?? "");
      const target = layout.get(nodes[targetIndex]?.slug ?? "");
      const sourceVelocity = velocities.get(nodes[sourceIndex]?.slug ?? "");
      const targetVelocity = velocities.get(nodes[targetIndex]?.slug ?? "");
      if (!source || !target || !sourceVelocity || !targetVelocity) continue;

      const dx = target.x - source.x || 0.01;
      const dy = target.y - source.y || 0.01;
      const distanceSquared = Math.max(dx * dx + dy * dy, 64);
      const force = strength / distanceSquared;
      const distance = Math.sqrt(distanceSquared);
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      sourceVelocity.x -= fx;
      sourceVelocity.y -= fy;
      targetVelocity.x += fx;
      targetVelocity.y += fy;
    }
  }
}

function applyLinks(
  edges: GraphEdge[],
  layout: Map<string, GraphLayoutNode>,
  velocities: Map<string, { x: number; y: number }>,
  linkDistance: number,
  alpha: number,
) {
  for (const edge of edges) {
    const source = layout.get(edge.source);
    const target = layout.get(edge.target);
    const sourceVelocity = velocities.get(edge.source);
    const targetVelocity = velocities.get(edge.target);
    if (!source || !target || !sourceVelocity || !targetVelocity) continue;

    const dx = target.x - source.x || 0.01;
    const dy = target.y - source.y || 0.01;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const force = (distance - linkDistance) * 0.018 * alpha;
    const fx = (dx / distance) * force;
    const fy = (dy / distance) * force;
    sourceVelocity.x += fx;
    sourceVelocity.y += fy;
    targetVelocity.x -= fx;
    targetVelocity.y -= fy;
  }
}

function applyCentering<T extends LinkableGraphNode>(
  nodes: T[],
  layout: Map<string, GraphLayoutNode>,
  velocities: Map<string, { x: number; y: number }>,
  centerX: number,
  centerY: number,
  alpha: number,
) {
  for (const node of nodes) {
    const point = layout.get(node.slug);
    const velocity = velocities.get(node.slug);
    if (!point || !velocity) continue;
    velocity.x += (centerX - point.x) * 0.004 * alpha;
    velocity.y += (centerY - point.y) * 0.004 * alpha;
  }
}

function integrate<T extends LinkableGraphNode>(
  nodes: T[],
  layout: Map<string, GraphLayoutNode>,
  velocities: Map<string, { x: number; y: number }>,
  options: ForceGraphLayoutOptions,
  damping: number,
) {
  for (const node of nodes) {
    const point = layout.get(node.slug);
    const velocity = velocities.get(node.slug);
    if (!point || !velocity) continue;

    velocity.x *= damping;
    velocity.y *= damping;
    point.x = clamp(
      point.x + velocity.x,
      point.radius,
      options.width - point.radius,
    );
    point.y = clamp(
      point.y + velocity.y,
      point.radius,
      options.height - point.radius,
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return clamp(value, min, max);
}
