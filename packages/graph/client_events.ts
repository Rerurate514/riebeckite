import type { RendererContext } from "./client_types.js";
import { DRAG_THRESHOLD_PX } from "./client_types.js";

export function createEventHandlers(r: RendererContext) {
  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    r.pendingFit = false;
    r.canvas.focus({ preventScroll: true });
    r.canvas.setPointerCapture(event.pointerId);
    r.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (r.pointers.size === 2) {
      const [first, second] = [...r.pointers.values()];
      if (first && second) {
        r.pinch = {
          distance: Math.hypot(second.x - first.x, second.y - first.y),
          center: {
            x: (first.x + second.x) / 2,
            y: (first.y + second.y) / 2,
          },
        };
        if (r.drag?.kind === "node" && r.simulation) {
          r.simulation.release(r.drag.id);
        }
        r.drag = null;
      }
      return;
    }

    const node = r.hitTest(event.clientX, event.clientY);
    if (node) {
      r.selectedId = node.id;
      r.callbacks.onSelect?.(node);
      r.drag = {
        kind: "node",
        id: node.id,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      r.requestFrame();
      return;
    }
    r.drag = {
      kind: "pan",
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent): void {
    if (r.pointers.has(event.pointerId)) {
      r.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (r.pinch && r.pointers.size >= 2) {
      const [first, second] = [...r.pointers.values()];
      if (!first || !second) return;
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const center = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      const rect = r.canvas.getBoundingClientRect();
      r.camera = {
        ...r.camera,
        x: r.camera.x + center.x - r.pinch.center.x,
        y: r.camera.y + center.y - r.pinch.center.y,
      };
      if (r.pinch.distance > 0) {
        r.zoomBy(distance / r.pinch.distance, {
          x: center.x - rect.left,
          y: center.y - rect.top,
        });
      }
      r.pinch = { distance, center };
      return;
    }

    if (r.drag?.kind === "node") {
      const moved =
        r.drag.moved ||
        Math.hypot(
          event.clientX - r.drag.startX,
          event.clientY - r.drag.startY,
        ) >= DRAG_THRESHOLD_PX;
      if (!moved) return;
      r.drag.moved = true;
      const point = r.toWorld(event.clientX, event.clientY);
      r.simulation?.fix(r.drag.id, point.x, point.y);
      r.requestFrame();
      return;
    }

    if (r.drag?.kind === "pan") {
      const dx = event.clientX - r.drag.lastX;
      const dy = event.clientY - r.drag.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 0) r.drag.moved = true;
      r.camera = { ...r.camera, x: r.camera.x + dx, y: r.camera.y + dy };
      r.drag.lastX = event.clientX;
      r.drag.lastY = event.clientY;
      r.requestFrame();
      return;
    }

    const node = r.hitTest(event.clientX, event.clientY);
    const nextHovered = node?.id ?? null;
    r.canvas.style.cursor = node ? "pointer" : "grab";
    if (r.hoveredId !== nextHovered) {
      r.hoveredId = nextHovered;
      r.callbacks.onHover?.(node);
      r.requestFrame();
    }
  }

  function onPointerUp(event: PointerEvent): void {
    r.pointers.delete(event.pointerId);
    if (r.canvas.hasPointerCapture(event.pointerId)) {
      r.canvas.releasePointerCapture(event.pointerId);
    }
    if (r.pointers.size < 2) r.pinch = null;

    const currentDrag = r.drag;
    r.drag = null;
    if (!currentDrag) return;

    if (currentDrag.kind === "node") {
      if (r.simulation) r.simulation.release(currentDrag.id);
      if (!currentDrag.moved) {
        const node = r.visible.nodes.find(
          (entry) => entry.id === currentDrag.id,
        );
        if (node) r.callbacks.onOpen?.(node);
      }
    } else if (!currentDrag.moved) {
      r.selectedId = null;
      r.callbacks.onSelect?.(null);
    }
    r.requestFrame();
  }

  function onPointerLeave(): void {
    if (r.drag) return;
    if (r.hoveredId !== null) {
      r.hoveredId = null;
      r.callbacks.onHover?.(null);
      r.requestFrame();
    }
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = r.canvas.getBoundingClientRect();
    r.zoomBy(Math.exp(-event.deltaY * 0.0015), {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  function onDoubleClick(event: MouseEvent): void {
    const node = r.hitTest(event.clientX, event.clientY);
    if (node) {
      r.callbacks.onOpen?.(node);
      return;
    }
    r.resetView();
  }

  function onContextMenu(event: MouseEvent): void {
    const node = r.hitTest(event.clientX, event.clientY);
    if (!node) return;
    event.preventDefault();
    r.callbacks.onContextMenu?.(node, event.clientX, event.clientY);
  }

  function onKeyDown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 120 : 40;
    switch (event.key) {
      case "+":
      case "=":
        event.preventDefault();
        r.zoomBy(1.2);
        return;
      case "-":
      case "_":
        event.preventDefault();
        r.zoomBy(1 / 1.2);
        return;
      case "ArrowLeft":
        event.preventDefault();
        r.pendingFit = false;
        r.camera = { ...r.camera, x: r.camera.x + step };
        break;
      case "ArrowRight":
        event.preventDefault();
        r.pendingFit = false;
        r.camera = { ...r.camera, x: r.camera.x - step };
        break;
      case "ArrowUp":
        event.preventDefault();
        r.pendingFit = false;
        r.camera = { ...r.camera, y: r.camera.y + step };
        break;
      case "ArrowDown":
        event.preventDefault();
        r.pendingFit = false;
        r.camera = { ...r.camera, y: r.camera.y - step };
        break;
      case "Escape":
        r.selectedId = null;
        r.callbacks.onSelect?.(null);
        break;
      case "Enter": {
        const node =
          r.visible.nodes.find(
            (entry) => entry.id === (r.hoveredId ?? r.selectedId),
          ) ?? null;
        if (node) {
          event.preventDefault();
          r.callbacks.onOpen?.(node);
        }
        return;
      }
      case "n":
      case "N":
      case "p":
      case "P": {
        const index = r.visible.nodes.findIndex(
          (entry) => entry.id === r.selectedId,
        );
        if (r.visible.nodes.length === 0) return;
        event.preventDefault();
        const direction = event.key.toLowerCase() === "n" ? 1 : -1;
        const next =
          r.visible.nodes[
            (index + direction + r.visible.nodes.length) %
              r.visible.nodes.length
          ];
        r.selectedId = next.id;
        r.callbacks.onSelect?.(next);
        r.focusNode(next.id);
        r.requestFrame();
        return;
      }
      default:
        return;
    }
    r.requestFrame();
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onWheel,
    onDoubleClick,
    onContextMenu,
    onKeyDown,
  };
}
