import { resolveExcaliBrainOptions } from "./options.js";
import type {
  ExcaliBrainGraph,
  ExcaliBrainLayout,
  ExcaliBrainNode,
  ExcaliBrainNodeRole,
  ExcaliBrainOptions,
  ExcaliBrainPositionedLink,
  ExcaliBrainPositionedNode,
  ExcaliBrainRegion,
  ExcaliBrainRole,
} from "./types.js";

export const EXCALIBRAIN_REGION_ORDER: readonly ExcaliBrainRegion[] = [
  "parents",
  "children",
  "left-friends",
  "right-friends",
  "previous",
  "next",
  "siblings",
];

const ROLE_ORDER: readonly ExcaliBrainRole[] = [
  "parent",
  "child",
  "leftFriend",
  "rightFriend",
  "previous",
  "next",
  "sibling",
];

const ROLE_REGION: Record<ExcaliBrainNodeRole, ExcaliBrainRegion> = {
  parent: "parents",
  child: "children",
  leftFriend: "left-friends",
  rightFriend: "right-friends",
  previous: "previous",
  next: "next",
  sibling: "siblings",
  center: "center",
};

const ROLE_ANCHOR: Record<
  ExcaliBrainRole,
  { angle: number; radius: "near" | "far" }
> = {
  parent: { angle: -90, radius: "near" },
  child: { angle: 90, radius: "near" },
  leftFriend: { angle: 180, radius: "near" },
  rightFriend: { angle: 0, radius: "near" },
  previous: { angle: 180, radius: "far" },
  next: { angle: 0, radius: "far" },
  sibling: { angle: 0, radius: "far" },
};

const SIBLING_ANGLES = [-135, -45, 135, 45] as const;
const NODE_HEIGHT = 36;
const CENTER_HEIGHT = 40;
const MAX_NODE_WIDTH = 150;
const MAX_CENTER_WIDTH = 180;

/**
 * Position every node in its ExcaliBrain region. Parents sit at the top,
 * children at the bottom, friends at the sides, previous/next at the far
 * left/right, and siblings around the periphery. Ordering within a region is
 * by title, so the layout is fully deterministic.
 */
export function layoutExcaliBrain(
  graph: ExcaliBrainGraph,
  options: ExcaliBrainOptions = {},
): ExcaliBrainLayout {
  const resolved = resolveExcaliBrainOptions(options);
  const width = resolved.width;
  const height = resolved.height;
  const cx = width / 2;
  const cy = height / 2;
  const minDimension = Math.min(width, height);
  const nearRadius = minDimension * 0.3;
  const farRadius = Math.max(
    nearRadius,
    Math.min(nearRadius * 1.5, minDimension / 2 - 28),
  );

  const positioned: ExcaliBrainPositionedNode[] = [
    positionCenter(graph.center, cx, cy, width, height),
  ];

  const groups = new Map<ExcaliBrainRole, ExcaliBrainNode[]>();
  for (const role of ROLE_ORDER) groups.set(role, []);
  for (const node of graph.nodes) {
    if (node.role === "center") continue;
    groups.get(node.role as ExcaliBrainRole)?.push(node);
  }

  const maxPerRegion = Math.max(0, Math.trunc(resolved.maxPerRegion));

  for (const role of ROLE_ORDER) {
    const group = [...(groups.get(role) ?? [])]
      .sort(compareNodes)
      .slice(0, maxPerRegion);
    if (group.length === 0) continue;

    if (role === "sibling") {
      const buckets: ExcaliBrainNode[][] = [[], [], [], []];
      group.forEach((node, index) => {
        buckets[index % SIBLING_ANGLES.length]?.push(node);
      });
      buckets.forEach((bucket, anchorIndex) => {
        bucket.forEach((node, index) => {
          const angle = spreadAngle(
            SIBLING_ANGLES[anchorIndex] ?? -135,
            index,
            bucket.length,
          );
          positioned.push(
            positionNode(node, angle, farRadius * 0.92, cx, cy, width, height),
          );
        });
      });
      continue;
    }

    const anchor = ROLE_ANCHOR[role];
    const radius = anchor.radius === "far" ? farRadius : nearRadius;
    group.forEach((node, index) => {
      const angle = spreadAngle(anchor.angle, index, group.length);
      positioned.push(positionNode(node, angle, radius, cx, cy, width, height));
    });
  }

  const ids = new Set(positioned.map((node) => node.id));
  const links: ExcaliBrainPositionedLink[] = [];
  const seen = new Set<string>();
  for (const link of graph.links) {
    if (!ids.has(link.from) || !ids.has(link.to)) continue;
    const key = `${link.from}\u0000${link.to}\u0000${link.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      from: link.from,
      to: link.to,
      role: link.role,
      relationType: link.relationType,
    });
  }

  return { width, height, nodes: positioned, links };
}

function positionCenter(
  center: ExcaliBrainNode,
  cx: number,
  cy: number,
  width: number,
  height: number,
): ExcaliBrainPositionedNode {
  const boxWidth = Math.min(
    MAX_CENTER_WIDTH,
    Math.max(72, Math.round(center.title.length * 7 + 24)),
  );
  return {
    id: center.id,
    role: "center",
    region: "center",
    relationType: center.relationType,
    title: center.title,
    slug: center.slug,
    permalink: center.permalink,
    virtual: center.virtual,
    x: clamp(Math.round(cx - boxWidth / 2), 4, width - boxWidth - 4),
    y: clamp(Math.round(cy - CENTER_HEIGHT / 2), 4, height - CENTER_HEIGHT - 4),
    width: boxWidth,
    height: CENTER_HEIGHT,
  };
}

function positionNode(
  node: ExcaliBrainNode,
  angle: number,
  radius: number,
  cx: number,
  cy: number,
  width: number,
  height: number,
): ExcaliBrainPositionedNode {
  const point = polar(cx, cy, angle, radius);
  const boxWidth = Math.min(
    MAX_NODE_WIDTH,
    Math.max(56, Math.round(node.title.length * 6.6 + 20)),
  );
  return {
    id: node.id,
    role: node.role,
    region: ROLE_REGION[node.role],
    relationType: node.relationType,
    title: node.title,
    slug: node.slug,
    permalink: node.permalink,
    virtual: node.virtual,
    x: clamp(Math.round(point.x - boxWidth / 2), 4, width - boxWidth - 4),
    y: clamp(
      Math.round(point.y - NODE_HEIGHT / 2),
      4,
      height - NODE_HEIGHT - 4,
    ),
    width: boxWidth,
    height: NODE_HEIGHT,
  };
}

function polar(
  cx: number,
  cy: number,
  angleDegrees: number,
  radius: number,
): { x: number; y: number } {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function spreadAngle(anchor: number, index: number, count: number): number {
  if (count <= 1) return anchor;
  const step = Math.min(16, 64 / count);
  return anchor + (index - (count - 1) / 2) * step;
}

function compareNodes(a: ExcaliBrainNode, b: ExcaliBrainNode): number {
  const left = a.title.toLowerCase();
  const right = b.title.toLowerCase();
  if (left < right) return -1;
  if (left > right) return 1;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  const upper = Math.max(min, max);
  return Math.min(Math.max(value, min), upper);
}
