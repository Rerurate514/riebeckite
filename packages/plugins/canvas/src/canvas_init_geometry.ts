export function pointInStage(
  stage: HTMLElement,
  event: PointerEvent,
): { x: number; y: number } {
  const bounds = stage.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

export function updateSelectionBox(
  stage: HTMLElement,
  selection: HTMLElement | null,
  start: { x: number; y: number },
  end: { x: number; y: number },
): void {
  if (!selection) return;
  selection.style.left = `${Math.min(start.x, end.x)}px`;
  selection.style.top = `${Math.min(start.y, end.y)}px`;
  selection.style.width = `${Math.abs(end.x - start.x)}px`;
  selection.style.height = `${Math.abs(end.y - start.y)}px`;
  stage.setAttribute("data-canvas-selecting", "true");
}
