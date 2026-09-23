import type { ExcalidrawPayload } from "./types.js";

export function initExcalidraw() {
  const figures = Array.from(
    document.querySelectorAll<HTMLElement>(
      '.rr-excalidraw[data-excalidraw="pending"]',
    ),
  );
  if (figures.length === 0) return;

  const immediate = figures.filter(
    (figure) => figure.dataset.excalidrawLazy === "false",
  );
  for (const figure of immediate) void renderFigure(figure);

  const lazy = figures.filter(
    (figure) => figure.dataset.excalidrawLazy !== "false",
  );
  if (lazy.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    for (const figure of lazy) void renderFigure(figure);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const figure = entry.target as HTMLElement;
        observer.unobserve(figure);
        void renderFigure(figure);
      }
    },
    { rootMargin: "200px" },
  );

  for (const figure of lazy) observer.observe(figure);
}

async function renderFigure(figure: HTMLElement): Promise<void> {
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
