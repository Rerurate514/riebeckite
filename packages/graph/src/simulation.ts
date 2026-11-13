import type { GraphLink } from "./types.js";

export type SimulationOptions = {
  centerForce: number;
  repelForce: number;
  linkForce: number;
  linkDistance: number;
};

export type SimulationNode = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
};

export type GraphSimulation = {
  nodes: readonly SimulationNode[];
  tick(): boolean;
  reheat(alpha?: number): void;
  setOptions(options: SimulationOptions): void;
  fix(id: string, x: number, y: number): void;
  release(id: string): void;
  stop(): void;
  isActive(): boolean;
  getAlpha(): number;
};

export type CreateSimulationInput = {
  nodeIds: readonly string[];
  links: readonly GraphLink[];
  options: SimulationOptions;
  positions?: ReadonlyMap<string, { x: number; y: number }>;
  centerId?: string | null;
};

const ALPHA_MIN = 0.001;
const ALPHA_DECAY = 0.0228;
const VELOCITY_DECAY = 0.4;
const MAX_VELOCITY = 40;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function createGraphSimulation(
  input: CreateSimulationInput,
): GraphSimulation {
  const ids = [...new Set(input.nodeIds)].sort((left, right) =>
    left.localeCompare(right),
  );
  const nodes: SimulationNode[] = ids.map((id, index) => {
    const previous = input.positions?.get(id);
    if (
      previous &&
      Number.isFinite(previous.x) &&
      Number.isFinite(previous.y)
    ) {
      return {
        id,
        x: previous.x,
        y: previous.y,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      };
    }
    if (id === input.centerId) {
      return { id, x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null };
    }
    const radius = 18 + 13 * Math.sqrt(index);
    const angle = index * GOLDEN_ANGLE + (hash(id) % 360) * (Math.PI / 180);
    return {
      id,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    };
  });

  const indexById = new Map(nodes.map((node, index) => [node.id, index]));
  const links = input.links
    .map((link) => ({
      source: indexById.get(link.source),
      target: indexById.get(link.target),
    }))
    .filter(
      (link): link is { source: number; target: number } =>
        link.source !== undefined && link.target !== undefined,
    );

  let options = { ...input.options };
  let alpha = 1;
  let alphaTarget = 0;
  let active = true;

  function tick(): boolean {
    if (!active && alpha < ALPHA_MIN) return false;

    alpha += (alphaTarget - alpha) * ALPHA_DECAY;
    applyCenterForce(nodes, options.centerForce, alpha);
    applyLinkForce(nodes, links, options, alpha);
    applyRepelForce(nodes, options.repelForce * alpha * 0.02);

    for (const node of nodes) {
      if (node.fx !== null && node.fy !== null) {
        node.x = node.fx;
        node.y = node.fy;
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      node.vx *= 1 - VELOCITY_DECAY;
      node.vy *= 1 - VELOCITY_DECAY;
      node.vx = clampVelocity(node.vx);
      node.vy = clampVelocity(node.vy);
      node.x += node.vx;
      node.y += node.vy;
    }

    if (alpha < ALPHA_MIN) {
      alpha = 0;
      active = false;
    }
    return active;
  }

  return {
    nodes,
    tick,
    reheat(value = 0.7) {
      alpha = Math.max(alpha, value);
      active = true;
    },
    setOptions(next) {
      options = { ...next };
      if (alpha < 0.05) {
        alpha = 0.05;
        active = true;
      }
    },
    fix(id, x, y) {
      const index = indexById.get(id);
      const node = index === undefined ? undefined : nodes[index];
      if (!node) return;
      node.fx = x;
      node.fy = y;
      node.x = x;
      node.y = y;
      node.vx = 0;
      node.vy = 0;
      alpha = Math.max(alpha, 0.5);
      active = true;
    },
    release(id) {
      const index = indexById.get(id);
      const node = index === undefined ? undefined : nodes[index];
      if (!node) return;
      node.fx = null;
      node.fy = null;
      alpha = Math.max(alpha, 0.45);
      active = true;
    },
    stop() {
      alpha = 0;
      alphaTarget = 0;
      active = false;
    },
    isActive() {
      return active;
    },
    getAlpha() {
      return alpha;
    },
  };
}

function applyCenterForce(
  nodes: readonly SimulationNode[],
  centerForce: number,
  alpha: number,
): void {
  const strength = centerForce * 0.03 * alpha;
  if (strength <= 0) return;
  for (const node of nodes) {
    node.vx -= node.x * strength;
    node.vy -= node.y * strength;
  }
}

function applyLinkForce(
  nodes: readonly SimulationNode[],
  links: readonly { source: number; target: number }[],
  options: SimulationOptions,
  alpha: number,
): void {
  const strength = options.linkForce * 0.12 * alpha;
  if (strength <= 0) return;
  for (const link of links) {
    const source = nodes[link.source];
    const target = nodes[link.target];
    if (!source || !target) continue;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.001) continue;
    const force = ((distance - options.linkDistance) / distance) * strength;
    source.vx += dx * force;
    source.vy += dy * force;
    target.vx -= dx * force;
    target.vy -= dy * force;
  }
}

function applyRepelForce(
  nodes: readonly SimulationNode[],
  strength: number,
): void {
  if (strength <= 0 || nodes.length < 2) return;
  if (nodes.length <= 250) {
    applyExactRepulsion(nodes, strength);
    return;
  }
  applyQuadtreeRepulsion(nodes, strength);
}

function applyExactRepulsion(
  nodes: readonly SimulationNode[],
  strength: number,
): void {
  for (let left = 0; left < nodes.length; left += 1) {
    const a = nodes[left];
    for (let right = left + 1; right < nodes.length; right += 1) {
      const b = nodes[right];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distanceSquared = dx * dx + dy * dy + 1;
      const force = strength / distanceSquared;
      a.vx -= dx * force;
      a.vy -= dy * force;
      b.vx += dx * force;
      b.vy += dy * force;
    }
  }
}

type QuadNode = {
  x: number;
  y: number;
  size: number;
  mass: number;
  centerX: number;
  centerY: number;
  members: number[] | null;
  children: QuadNode[] | null;
};

function applyQuadtreeRepulsion(
  nodes: readonly SimulationNode[],
  strength: number,
): void {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  }
  const size = Math.max(maxX - minX, maxY - minY, 1) + 1;
  const root: QuadNode = {
    x: (minX + maxX - size) / 2,
    y: (minY + maxY - size) / 2,
    size,
    mass: 0,
    centerX: 0,
    centerY: 0,
    members: null,
    children: null,
  };
  for (let index = 0; index < nodes.length; index += 1) {
    insertQuad(root, nodes, index, 0);
  }
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    applyQuadForce(root, nodes, node, index, strength);
  }
}

function insertQuad(
  quad: QuadNode,
  nodes: readonly SimulationNode[],
  index: number,
  depth: number,
): void {
  const node = nodes[index];
  quad.centerX = (quad.centerX * quad.mass + node.x) / (quad.mass + 1);
  quad.centerY = (quad.centerY * quad.mass + node.y) / (quad.mass + 1);
  quad.mass += 1;

  if (quad.children) {
    insertIntoChild(quad, nodes, index, depth + 1);
    return;
  }
  if (!quad.members) {
    quad.members = [index];
    return;
  }
  if (depth >= 16) {
    quad.members.push(index);
    return;
  }

  const members = quad.members;
  quad.members = null;
  const half = quad.size / 2;
  quad.children = [
    createQuad(quad.x, quad.y, half),
    createQuad(quad.x + half, quad.y, half),
    createQuad(quad.x, quad.y + half, half),
    createQuad(quad.x + half, quad.y + half, half),
  ];
  for (const member of members) insertIntoChild(quad, nodes, member, depth + 1);
  insertIntoChild(quad, nodes, index, depth + 1);
}

function insertIntoChild(
  quad: QuadNode,
  nodes: readonly SimulationNode[],
  index: number,
  depth: number,
): void {
  const children = quad.children;
  if (!children) return;
  const node = nodes[index];
  const half = quad.size / 2;
  const right = node.x >= quad.x + half ? 1 : 0;
  const bottom = node.y >= quad.y + half ? 2 : 0;
  const child = children[right + bottom];
  if (child) insertQuad(child, nodes, index, depth);
}

function createQuad(x: number, y: number, size: number): QuadNode {
  return {
    x,
    y,
    size,
    mass: 0,
    centerX: 0,
    centerY: 0,
    members: null,
    children: null,
  };
}

function applyQuadForce(
  quad: QuadNode,
  nodes: readonly SimulationNode[],
  target: SimulationNode,
  targetIndex: number,
  strength: number,
): void {
  if (quad.mass === 0) return;
  const dx = quad.centerX - target.x;
  const dy = quad.centerY - target.y;
  const distanceSquared = dx * dx + dy * dy + 1;

  if (!quad.children) {
    for (const index of quad.members ?? []) {
      if (index === targetIndex) continue;
      const other = nodes[index];
      applyPairRepulsion(target, other, strength);
    }
    return;
  }

  if (quad.size * quad.size < 0.81 * distanceSquared) {
    const force = (strength * quad.mass) / distanceSquared;
    target.vx -= dx * force;
    target.vy -= dy * force;
    return;
  }

  for (const child of quad.children) {
    applyQuadForce(child, nodes, target, targetIndex, strength);
  }
}

function applyPairRepulsion(
  a: SimulationNode,
  b: SimulationNode,
  strength: number,
): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distanceSquared = dx * dx + dy * dy + 1;
  const force = strength / distanceSquared;
  a.vx -= dx * force;
  a.vy -= dy * force;
  b.vx += dx * force;
  b.vy += dy * force;
}

function clampVelocity(value: number): number {
  return Math.min(Math.max(value, -MAX_VELOCITY), MAX_VELOCITY);
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
