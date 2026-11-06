import type { CanvasCamera, CanvasLayout } from "./types.js";

export const MIN_CANVAS_SCALE = 0.05;
export const MAX_CANVAS_SCALE = 4;
export const CANVAS_PADDING = 32;

export function worldToScreen(
  point: { x: number; y: number },
  camera: CanvasCamera,
): { x: number; y: number } {
  return {
    x: point.x * camera.scale + camera.x,
    y: point.y * camera.scale + camera.y,
  };
}

export function screenToWorld(
  point: { x: number; y: number },
  camera: CanvasCamera,
): { x: number; y: number } {
  return {
    x: (point.x - camera.x) / camera.scale,
    y: (point.y - camera.y) / camera.scale,
  };
}

export function panBy(
  camera: CanvasCamera,
  delta: { x: number; y: number },
): CanvasCamera {
  return { ...camera, x: camera.x + delta.x, y: camera.y + delta.y };
}

export function zoomAt(
  camera: CanvasCamera,
  factor: number,
  point: { x: number; y: number },
): CanvasCamera {
  const scale = clamp(
    camera.scale * factor,
    MIN_CANVAS_SCALE,
    MAX_CANVAS_SCALE,
  );
  const world = screenToWorld(point, camera);
  return {
    x: point.x - world.x * scale,
    y: point.y - world.y * scale,
    scale,
  };
}

export function fitBounds(
  layout: CanvasLayout,
  width: number,
  height: number,
): CanvasCamera {
  const scale = clamp(
    Math.min(
      (width - CANVAS_PADDING * 2) / Math.max(layout.width, 1),
      (height - CANVAS_PADDING * 2) / Math.max(layout.height, 1),
    ),
    MIN_CANVAS_SCALE,
    1,
  );
  return centerOnBounds(layout, width, height, scale);
}

export function centerOnBounds(
  layout: Pick<CanvasLayout, "width" | "height">,
  width: number,
  height: number,
  scale: number,
): CanvasCamera {
  return {
    x: (width - layout.width * scale) / 2,
    y: (height - layout.height * scale) / 2,
    scale,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
