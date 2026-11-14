import type { Point, RendererContext } from "./client_types.js";
import { clamp, truncateLabel, withAlpha } from "./client_utils.js";
import type { VisibleGraphNode } from "./index.js";

export function createDrawing() {
  function draw(r: RendererContext): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    r.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    r.ctx.clearRect(0, 0, r.size.width, r.size.height);
    r.ctx.fillStyle = r.colors.background;
    r.ctx.fillRect(0, 0, r.size.width, r.size.height);

    const related = r.relatedIds();
    const dimOthers = related.size > 0;
    const selected = r.selectedId;
    const labelThreshold = 0.35 + (r.input?.settings.textFade ?? 0.35) * 1.1;
    const labelAlpha = clamp((r.camera.scale - labelThreshold) / 0.4, 0, 1);
    const nodes = r.simulation?.nodes ?? [];
    const simulationById = new Map(nodes.map((node) => [node.id, node]));
    const positions = new Map<
      string,
      { node: VisibleGraphNode; x: number; y: number; radius: number }
    >();

    for (const node of r.visible.nodes) {
      const revealAt = r.reveal.get(node.id);
      if (revealAt !== undefined && revealAt > r.animationCutoff) {
        continue;
      }
      const simulationNode = simulationById.get(node.id);
      if (!simulationNode) continue;
      const x = simulationNode.x;
      const y = simulationNode.y;
      positions.set(node.id, {
        node,
        x,
        y,
        radius: Math.max(2, node.radius * (r.input?.settings.nodeSize ?? 1)),
      });
    }

    const linkThickness = r.input?.settings.linkThickness ?? 1;
    r.ctx.lineCap = "round";
    for (const link of r.visible.links) {
      const source = positions.get(link.source);
      const target = positions.get(link.target);
      if (!source || !target) continue;
      const emphasized = related.has(link.source) && related.has(link.target);
      const alpha = dimOthers ? (emphasized ? 0.72 : 0.06) : 0.28;
      const [sx, sy] = r.toScreen(source.x, source.y);
      const [tx, ty] = r.toScreen(target.x, target.y);
      if (!r.segmentVisible(sx, sy, tx, ty)) continue;
      r.ctx.strokeStyle = withAlpha(r.colors.edge, alpha);
      r.ctx.lineWidth = Math.max(
        0.5,
        linkThickness * (emphasized ? 1.15 : 0.7) * Math.sqrt(r.camera.scale),
      );
      r.ctx.beginPath();
      r.ctx.moveTo(sx, sy);
      r.ctx.lineTo(tx, ty);
      r.ctx.stroke();
      if (r.input?.settings.arrows) {
        r.drawArrow(sx, sy, tx, ty, alpha);
      }
    }

    const labelBudget =
      r.visible.nodes.length > 900
        ? 0
        : r.visible.nodes.length > 500
          ? 120
          : 400;
    let labelsDrawn = 0;
    const labelBounds: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    }[] = [];
    for (const entry of positions.values()) {
      const { node, x, y, radius } = entry;
      const [sx, sy] = r.toScreen(x, y);
      const screenRadius = Math.max(1.5, radius * r.camera.scale);
      if (
        sx < -screenRadius ||
        sy < -screenRadius ||
        sx > r.size.width + screenRadius ||
        sy > r.size.height + screenRadius
      ) {
        continue;
      }
      const isRelated = related.has(node.id);
      const alpha = dimOthers && !isRelated ? 0.15 : 0.92;
      const isSelected = selected === node.id;
      const isHovered = r.hoveredId === node.id;

      if (isSelected || isHovered) {
        r.ctx.beginPath();
        r.ctx.arc(sx, sy, screenRadius + 3, 0, Math.PI * 2);
        r.ctx.strokeStyle = withAlpha(r.colors.focus, isSelected ? 0.9 : 0.5);
        r.ctx.lineWidth = 1.5;
        r.ctx.stroke();
      }

      r.ctx.beginPath();
      r.ctx.arc(sx, sy, screenRadius, 0, Math.PI * 2);
      r.ctx.fillStyle = withAlpha(r.nodeColor(node), alpha);
      r.ctx.fill();
      r.ctx.strokeStyle = withAlpha(r.colors.background, 0.8);
      r.ctx.lineWidth = 1;
      r.ctx.stroke();

      const canDrawLabel =
        labelAlpha > 0.02 &&
        (labelBudget === 0
          ? isSelected || isHovered || isRelated
          : labelsDrawn < labelBudget);
      if (!canDrawLabel) continue;
      labelsDrawn += 1;
      const title = truncateLabel(node.title);
      r.ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      r.ctx.textBaseline = "middle";
      r.ctx.textAlign = "left";
      const labelWidth = r.ctx.measureText(title).width;
      let labelX = sx + screenRadius + 6;
      let left = labelX;
      let right = labelX + labelWidth;
      if (right > r.size.width - 4) {
        labelX = sx - screenRadius - 6;
        r.ctx.textAlign = "right";
        left = labelX - labelWidth;
        right = labelX;
      }
      const labelY = sy;
      const top = labelY - 7;
      const bottom = labelY + 7;
      if (
        top < 4 ||
        bottom > r.size.height - 4 ||
        labelBounds.some(
          (bounds) =>
            left < bounds.right &&
            right > bounds.left &&
            top < bounds.bottom &&
            bottom > bounds.top,
        )
      ) {
        continue;
      }
      labelBounds.push({ left, top, right, bottom });
      r.ctx.strokeStyle = withAlpha(
        r.colors.background,
        0.85 * labelAlpha * alpha,
      );
      r.ctx.lineWidth = 3;
      r.ctx.strokeText(title, labelX, labelY);
      r.ctx.fillStyle = withAlpha(r.colors.label, labelAlpha * alpha);
      r.ctx.fillText(title, labelX, labelY);
    }
  }

  function drawArrow(
    r: RendererContext,
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    alpha: number,
  ): void {
    const angle = Math.atan2(ty - sy, tx - sx);
    const length = 5;
    const x = tx - Math.cos(angle) * 4;
    const y = ty - Math.sin(angle) * 4;
    r.ctx.fillStyle = withAlpha(r.colors.edge, Math.min(0.8, alpha + 0.1));
    r.ctx.beginPath();
    r.ctx.moveTo(x, y);
    r.ctx.lineTo(
      x - Math.cos(angle - 0.45) * length,
      y - Math.sin(angle - 0.45) * length,
    );
    r.ctx.lineTo(
      x - Math.cos(angle + 0.45) * length,
      y - Math.sin(angle + 0.45) * length,
    );
    r.ctx.closePath();
    r.ctx.fill();
  }

  function toScreen(
    r: RendererContext,
    x: number,
    y: number,
  ): [number, number] {
    return [r.camera.x + x * r.camera.scale, r.camera.y + y * r.camera.scale];
  }

  function toWorld(
    r: RendererContext,
    clientX: number,
    clientY: number,
  ): Point {
    const rect = r.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - r.camera.x) / r.camera.scale,
      y: (clientY - rect.top - r.camera.y) / r.camera.scale,
    };
  }

  function hitTest(
    r: RendererContext,
    clientX: number,
    clientY: number,
  ): VisibleGraphNode | null {
    if (!r.input) return null;
    const rect = r.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best: { node: VisibleGraphNode; distance: number } | null = null;
    const nodes = r.simulation?.nodes ?? [];
    const simulationById = new Map(nodes.map((node) => [node.id, node]));
    for (const node of r.visible.nodes) {
      if ((r.reveal.get(node.id) ?? 0) > r.animationCutoff) continue;
      const simulationNode = simulationById.get(node.id);
      if (!simulationNode) continue;
      const [sx, sy] = r.toScreen(simulationNode.x, simulationNode.y);
      const radius = Math.max(
        6,
        node.radius * (r.input.settings.nodeSize ?? 1) * r.camera.scale + 4,
      );
      const distance = Math.hypot(x - sx, y - sy);
      if (distance <= radius && (!best || distance < best.distance)) {
        best = { node, distance };
      }
    }
    return best?.node ?? null;
  }

  function relatedIds(r: RendererContext): Set<string> {
    const origin = r.hoveredId;
    const related = new Set<string>();
    if (!origin) return related;
    related.add(origin);
    for (const link of r.visible.links) {
      if (link.source === origin) related.add(link.target);
      if (link.target === origin) related.add(link.source);
    }
    return related;
  }

  function nodeColor(r: RendererContext, node: VisibleGraphNode): string {
    if (node.color) return node.color;
    switch (node.kind) {
      case "unresolved":
      case "attachment":
        return r.colors.muted;
      case "tag":
        return r.colors.link;
      case "note":
        return r.colors.accent;
    }
  }

  function segmentVisible(
    r: RendererContext,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): boolean {
    return !(
      Math.max(x1, x2) < 0 ||
      Math.max(y1, y2) < 0 ||
      Math.min(x1, x2) > r.size.width ||
      Math.min(y1, y2) > r.size.height
    );
  }

  return {
    draw,
    drawArrow,
    toScreen,
    toWorld,
    hitTest,
    relatedIds,
    nodeColor,
    segmentVisible,
  };
}
