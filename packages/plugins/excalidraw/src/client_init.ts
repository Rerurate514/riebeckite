import type { ExcalidrawPayload } from "./types.js";

type ClientContext = { root?: ParentNode; signal?: AbortSignal };

export function initExcalidraw(context: ClientContext = {}) {
  const root = context.root ?? document;
  const figures = Array.from(
    root.querySelectorAll<HTMLElement>(
      '.rr-excalidraw[data-excalidraw="pending"]',
    ),
  );
  if (figures.length === 0) return;

  const immediate = figures.filter(
    (figure) => figure.dataset.excalidrawLazy === "false",
  );
  for (const figure of immediate) void renderFigure(figure, context.signal);

  const lazy = figures.filter(
    (figure) => figure.dataset.excalidrawLazy !== "false",
  );
  if (lazy.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    for (const figure of lazy) void renderFigure(figure, context.signal);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const figure = entry.target as HTMLElement;
        observer.unobserve(figure);
        void renderFigure(figure, context.signal);
      }
    },
    { rootMargin: "200px" },
  );

  for (const figure of lazy) observer.observe(figure);
  return () => observer.disconnect();
}

async function renderFigure(
  figure: HTMLElement,
  signal?: AbortSignal,
): Promise<void> {
  const canvas = figure.querySelector<HTMLElement>(".rr-excalidraw__canvas");
  const payloadScript = figure.querySelector<HTMLScriptElement>(
    ".rr-excalidraw__payload",
  );
  if (!canvas || !payloadScript?.textContent) return;

  try {
    const payload = JSON.parse(payloadScript.textContent) as ExcalidrawPayload;
    const { exportToSvg } = await import("@excalidraw/excalidraw");
    const svg = await exportToSvg({
      elements: payload.elements as never,
      appState: {
        ...payload.appState,
        exportBackground: payload.appState.exportBackground ?? false,
      } as never,
      files: payload.files as never,
    });
    if (signal?.aborted || !figure.isConnected) return;

    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("role", "img");
    canvas.replaceChildren(svg);
    figure.dataset.excalidraw = "ready";
  } catch (error) {
    console.error("[plugin-excalidraw] SVG export failed", error);
    figure.dataset.excalidraw = "error";
    canvas.textContent = "Drawing could not be rendered.";
  }
}
