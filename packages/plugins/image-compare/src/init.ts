type ImageCompareContext = {
  root?: ParentNode;
};

export function initImageCompare(context: ImageCompareContext = {}) {
  const root = context.root ?? document;
  const cleanups: Array<() => void> = [];

  for (const figure of root.querySelectorAll<HTMLElement>(
    "[data-rr-image-compare]",
  )) {
    if (figure.dataset.enhanced === "true") continue;
    const input = figure.querySelector<HTMLInputElement>(
      "[data-image-compare-range]",
    );
    if (!input) continue;
    const stage =
      input.closest<HTMLElement>(".rr-image-compare__stage") ?? figure;
    const vertical = figure.dataset.orientation === "vertical";

    const update = () => {
      figure.style.setProperty(
        "--rr-image-compare-position",
        `${input.value}%`,
      );
    };
    const setFromPointer = (event: PointerEvent) => {
      const bounds = stage.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;
      const ratio = vertical
        ? (event.clientY - bounds.top) / bounds.height
        : (event.clientX - bounds.left) / bounds.width;
      input.value = String(Math.round(Math.min(1, Math.max(0, ratio)) * 100));
      update();
    };
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      input.focus({ preventScroll: true });
      input.setPointerCapture(event.pointerId);
      setFromPointer(event);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!input.hasPointerCapture(event.pointerId)) return;
      event.preventDefault();
      setFromPointer(event);
    };
    const reset = () => {
      delete figure.dataset.enhanced;
      figure.style.removeProperty("--rr-image-compare-position");
    };

    figure.dataset.enhanced = "true";
    update();
    input.addEventListener("input", update);
    input.addEventListener("pointerdown", onPointerDown);
    input.addEventListener("pointermove", onPointerMove);
    cleanups.push(() => {
      input.removeEventListener("input", update);
      input.removeEventListener("pointerdown", onPointerDown);
      input.removeEventListener("pointermove", onPointerMove);
      reset();
    });
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
