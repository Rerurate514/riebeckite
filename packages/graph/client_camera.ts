import type { Point, RendererContext } from "./client_types.js";
import { MAX_SCALE, MIN_SCALE } from "./client_types.js";
import { clamp } from "./client_utils.js";

export function createCameraController() {
  function resize(r: RendererContext): void {
    const rect = r.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (
      r.canvas.width !== Math.round(width * dpr) ||
      r.canvas.height !== Math.round(height * dpr)
    ) {
      r.canvas.width = Math.round(width * dpr);
      r.canvas.height = Math.round(height * dpr);
    }
    r.size = { width, height };
    r.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (r.camera.x === 0 && r.camera.y === 0) {
      r.camera = { x: width / 2, y: height / 2, scale: 1 };
    }
    r.requestFrame();
  }

  function fitView(r: RendererContext): void {
    if (r.visible.nodes.length === 0) {
      r.camera = { x: r.size.width / 2, y: r.size.height / 2, scale: 1 };
      return;
    }
    const positions = r.simulation?.nodes ?? [];
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const node of positions) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    }
    if (!Number.isFinite(minX)) {
      r.camera = { x: r.size.width / 2, y: r.size.height / 2, scale: 1 };
      return;
    }
    const boundsWidth = Math.max(maxX - minX, 80);
    const boundsHeight = Math.max(maxY - minY, 80);
    const scale = clamp(
      Math.min(
        (r.size.width - 80) / boundsWidth,
        (r.size.height - 80) / boundsHeight,
      ),
      0.2,
      2,
    );
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    r.camera = {
      x: r.size.width / 2 - centerX * scale,
      y: r.size.height / 2 - centerY * scale,
      scale,
    };
  }

  function resetView(r: RendererContext): void {
    r.pendingFit = false;
    r.fitView();
    r.requestFrame();
  }

  function focusNode(r: RendererContext, id: string): void {
    const node = r.simulation?.nodes.find((entry) => entry.id === id);
    if (!node) return;
    r.pendingFit = false;
    r.camera = {
      ...r.camera,
      x: r.size.width / 2 - node.x * r.camera.scale,
      y: r.size.height / 2 - node.y * r.camera.scale,
    };
    r.requestFrame();
  }

  function zoomBy(r: RendererContext, factor: number, origin?: Point): void {
    r.pendingFit = false;
    const center = origin ?? { x: r.size.width / 2, y: r.size.height / 2 };
    const scale = clamp(r.camera.scale * factor, MIN_SCALE, MAX_SCALE);
    if (scale === r.camera.scale) return;
    const worldX = (center.x - r.camera.x) / r.camera.scale;
    const worldY = (center.y - r.camera.y) / r.camera.scale;
    r.camera = {
      x: center.x - worldX * scale,
      y: center.y - worldY * scale,
      scale,
    };
    r.requestFrame();
  }

  return { resize, fitView, resetView, focusNode, zoomBy };
}
