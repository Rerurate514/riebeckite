import type { SimulationNode, SimulationOptions } from "./simulation_types.js";
import { MAX_VELOCITY } from "./simulation_types.js";

export function applyCenterForce(
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

export function applyLinkForce(
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

export function applyRepelForce(
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

export function applyExactRepulsion(
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

export type QuadNode = {
  x: number;
  y: number;
  size: number;
  mass: number;
  centerX: number;
  centerY: number;
  members: number[] | null;
  children: QuadNode[] | null;
};

export function applyQuadtreeRepulsion(
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

export function insertQuad(
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

export function insertIntoChild(
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

export function createQuad(x: number, y: number, size: number): QuadNode {
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

export function applyQuadForce(
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

export function applyPairRepulsion(
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

export function clampVelocity(value: number): number {
  return Math.min(Math.max(value, -MAX_VELOCITY), MAX_VELOCITY);
}

export function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
