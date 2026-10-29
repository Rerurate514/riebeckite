export type DismissableOptions = {
  readonly dismiss: () => void;
  readonly contains?: (target: Node) => boolean;
};

type Layer = DismissableOptions;

const layers: Layer[] = [];
let listening = false;

export function createDismissable(options: DismissableOptions): () => void {
  if (typeof document === "undefined") return () => {};

  if (!listening) {
    listening = true;
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
  }

  layers.push(options);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const index = layers.indexOf(options);
    if (index >= 0) layers.splice(index, 1);
  };
}

function topLayer(): Layer | undefined {
  return layers.at(-1);
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Escape" || event.defaultPrevented) return;

  const layer = topLayer();
  if (!layer) return;

  event.preventDefault();
  layer.dismiss();
}

function onPointerDown(event: PointerEvent): void {
  if (event.defaultPrevented) return;

  const layer = topLayer();
  if (!layer) return;
  if (!(event.target instanceof Node)) return;
  if (layer.contains?.(event.target)) return;

  layer.dismiss();
}
