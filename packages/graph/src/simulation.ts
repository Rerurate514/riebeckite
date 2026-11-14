import {
  applyCenterForce,
  applyLinkForce,
  applyRepelForce,
  clampVelocity,
  hash,
} from "./simulation_forces.js";
import type {
  CreateSimulationInput,
  GraphSimulation,
  SimulationNode,
} from "./simulation_types.js";
import {
  ALPHA_DECAY,
  ALPHA_MIN,
  GOLDEN_ANGLE,
  VELOCITY_DECAY,
} from "./simulation_types.js";

export type {
  CreateSimulationInput,
  GraphSimulation,
  SimulationNode,
  SimulationOptions,
} from "./simulation_types.js";

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
