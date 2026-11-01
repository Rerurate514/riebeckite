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

    const update = () => {
      figure.style.setProperty(
        "--rr-image-compare-position",
        `${input.value}%`,
      );
    };
    const reset = () => {
      delete figure.dataset.enhanced;
      figure.style.removeProperty("--rr-image-compare-position");
    };

    figure.dataset.enhanced = "true";
    update();
    input.addEventListener("input", update);
    cleanups.push(() => {
      input.removeEventListener("input", update);
      reset();
    });
  }

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
