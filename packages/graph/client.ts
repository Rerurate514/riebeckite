import { createAnimationController } from "./client_animation.js";
import { createCameraController } from "./client_camera.js";
import { createDrawing } from "./client_draw.js";
import { createEventHandlers } from "./client_events.js";
import type {
  GraphRenderer,
  GraphRendererOptions,
  RendererContext,
} from "./client_types.js";
import { createNoopRenderer, readColors } from "./client_utils.js";

export type {
  GraphRenderer,
  GraphRendererCallbacks,
  GraphRendererInput,
  GraphRendererOptions,
} from "./client_types.js";

export function createGraphRenderer(
  options: GraphRendererOptions,
): GraphRenderer {
  const canvas = options.canvas;
  const context = canvas.getContext("2d");
  if (!context) {
    return createNoopRenderer();
  }

  const r = {
    canvas,
    ctx: context,
    callbacks: options,
    input: null,
    visible: {
      nodes: [],
      links: [],
      centerId: null,
      unsupportedOperators: [],
    },
    simulation: null,
    signature: "",
    camera: { x: 0, y: 0, scale: 1 },
    size: { width: 0, height: 0 },
    hoveredId: null,
    selectedId: null,
    drag: null,
    pointers: new Map(),
    pinch: null,
    frameHandle: null,
    paused: false,
    destroyed: false,
    animating: false,
    animationStart: 0,
    animationCutoff: 1,
    pendingFit: false,
    reveal: new Map(),
    colors: readColors(canvas),
    reducedMotion: options.reducedMotion ?? false,
  } as unknown as RendererContext;

  Object.assign(
    r,
    createCameraController(),
    createDrawing(),
    createEventHandlers(r),
    createAnimationController(),
  );

  const resizeObserver = new ResizeObserver(() => r.resize());
  const intersectionObserver = new IntersectionObserver((entries) => {
    r.paused = entries.every((entry) => !entry.isIntersecting);
    if (!r.paused) r.requestFrame();
  });
  const mutationObserver = new MutationObserver(() => {
    r.colors = readColors(canvas);
    r.requestFrame();
  });

  const onVisibilityChange = () => {
    r.paused = document.visibilityState === "hidden";
    if (!r.paused) r.requestFrame();
  };

  resizeObserver.observe(canvas);
  intersectionObserver.observe(canvas);
  mutationObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-rb-mode", "data-rb-theme", "class", "style"],
  });
  document.addEventListener("visibilitychange", onVisibilityChange);

  canvas.addEventListener("pointerdown", r.onPointerDown);
  canvas.addEventListener("pointermove", r.onPointerMove);
  canvas.addEventListener("pointerup", r.onPointerUp);
  canvas.addEventListener("pointercancel", r.onPointerUp);
  canvas.addEventListener("pointerleave", r.onPointerLeave);
  canvas.addEventListener("wheel", r.onWheel, { passive: false });
  canvas.addEventListener("dblclick", r.onDoubleClick);
  canvas.addEventListener("contextmenu", r.onContextMenu);
  canvas.addEventListener("keydown", r.onKeyDown);

  r.resize();

  function destroy(): void {
    if (r.destroyed) return;
    r.destroyed = true;
    if (r.frameHandle !== null) cancelAnimationFrame(r.frameHandle);
    r.frameHandle = null;
    r.simulation?.stop();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    mutationObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    canvas.removeEventListener("pointerdown", r.onPointerDown);
    canvas.removeEventListener("pointermove", r.onPointerMove);
    canvas.removeEventListener("pointerup", r.onPointerUp);
    canvas.removeEventListener("pointercancel", r.onPointerUp);
    canvas.removeEventListener("pointerleave", r.onPointerLeave);
    canvas.removeEventListener("wheel", r.onWheel);
    canvas.removeEventListener("dblclick", r.onDoubleClick);
    canvas.removeEventListener("contextmenu", r.onContextMenu);
    canvas.removeEventListener("keydown", r.onKeyDown);
  }

  return {
    update: r.update,
    setSelected: r.setSelected,
    zoomBy: r.zoomBy,
    resetView: r.resetView,
    focusNode: r.focusNode,
    playAnimation: r.playAnimation,
    stopAnimation: r.stopAnimation,
    isAnimating: () => r.animating,
    destroy,
  };
}
