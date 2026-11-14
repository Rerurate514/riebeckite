import type { GraphRendererInput, RendererContext } from "./client_types.js";
import { ANIMATION_DURATION_MS } from "./client_types.js";
import { clamp, forceOptions, visibleSignature } from "./client_utils.js";
import {
  buildRevealSchedule,
  buildVisibleGraph,
  createGraphSimulation,
} from "./index.js";

export function createAnimationController() {
  function update(r: RendererContext, next: GraphRendererInput): void {
    if (r.destroyed) return;
    const previousMode = r.input?.mode;
    const previousCenter = r.input?.centerId;
    const previousDocument = r.input?.document;
    r.input = next;
    r.visible = buildVisibleGraph({
      document: next.document,
      settings: next.settings,
      mode: next.mode,
      centerId: next.centerId,
    });
    r.selectedId = next.selectedId ?? null;
    r.reveal = new Map(
      buildRevealSchedule(r.visible.nodes).map((entry) => [entry.id, entry.at]),
    );

    const nextSignature = visibleSignature(r.visible);
    const positions = r.simulation
      ? new Map(
          r.simulation.nodes.map((node) => [node.id, { x: node.x, y: node.y }]),
        )
      : undefined;

    if (nextSignature !== r.signature || !r.simulation) {
      r.signature = nextSignature;
      r.simulation = createGraphSimulation({
        nodeIds: r.visible.nodes.map((node) => node.id),
        links: r.visible.links,
        options: forceOptions(next.settings),
        positions,
        centerId: r.visible.centerId,
      });
      if (
        !previousDocument ||
        previousDocument !== next.document ||
        previousMode !== next.mode ||
        previousCenter !== next.centerId
      ) {
        r.pendingFit = true;
        r.fitView();
      }
    } else {
      r.simulation.setOptions(forceOptions(next.settings));
    }

    if (!next.settings.animate) {
      r.animating = false;
      r.animationCutoff = 1;
    }
    r.requestFrame();
  }

  function setSelected(r: RendererContext, id: string | null): void {
    if (r.selectedId === id) return;
    r.selectedId = id;
    r.requestFrame();
  }

  function playAnimation(r: RendererContext): void {
    if (r.reducedMotion || r.visible.nodes.length === 0) {
      r.animationCutoff = 1;
      r.animating = false;
      r.callbacks.onAnimationChange?.(false);
      r.requestFrame();
      return;
    }
    r.animationStart = performance.now();
    r.animationCutoff = 0;
    r.animating = true;
    r.callbacks.onAnimationChange?.(true);
    r.requestFrame();
  }

  function stopAnimation(r: RendererContext): void {
    r.animating = false;
    r.animationCutoff = 1;
    r.callbacks.onAnimationChange?.(false);
    r.requestFrame();
  }

  function requestFrame(r: RendererContext): void {
    if (r.destroyed || r.paused || r.frameHandle !== null) return;
    r.frameHandle = requestAnimationFrame(r.frame);
  }

  function frame(r: RendererContext, time: number): void {
    r.frameHandle = null;
    if (r.destroyed) return;
    if (r.animating) {
      const progress = clamp(
        (time - r.animationStart) / ANIMATION_DURATION_MS,
        0,
        1,
      );
      r.animationCutoff = progress;
      if (progress >= 1) {
        r.animating = false;
        r.callbacks.onAnimationChange?.(false);
      }
    }
    const active = r.simulation?.tick() ?? false;
    if (r.pendingFit && r.simulation && !active) {
      r.pendingFit = false;
      r.fitView();
    }
    r.draw();
    if (active || r.animating) r.requestFrame();
  }

  return {
    update,
    setSelected,
    playAnimation,
    stopAnimation,
    requestFrame,
    frame,
  };
}
