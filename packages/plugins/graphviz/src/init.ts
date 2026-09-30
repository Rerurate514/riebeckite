import type {
  GraphvizClientOptions,
  GraphvizEngine,
  GraphvizRenderer,
} from "./types.js";

const DEFAULT_ENGINE: GraphvizEngine = "dot";
const DEFAULT_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@viz-js/viz@3/+esm";

/**
 * Client-side initializer used by the `"client"` (and failed `"both"`) render
 * modes. It fills every `[data-graphviz="pending"]` figure with an SVG produced
 * in the browser and flips the state attribute to `"rendered"`.
 */
export async function initGraphvizDiagrams(
  options: GraphvizClientOptions = {},
) {
  const renderer = options.renderer ?? (await loadRenderer(options.scriptUrl));
  if (!renderer) return;

  const figures = document.querySelectorAll<HTMLElement>(
    '[data-graphviz="pending"]',
  );

  for (const figure of Array.from(figures)) {
    renderFigure(renderer, figure, options.engine ?? DEFAULT_ENGINE);
  }
}

function renderFigure(
  renderer: GraphvizRenderer,
  figure: HTMLElement,
  fallbackEngine: GraphvizEngine,
) {
  const source = figure.dataset.graphvizSource;
  const canvas = figure.querySelector<HTMLElement>("[data-graphviz-canvas]");
  if (!source || !canvas) return;

  const engine = normalizeEngine(
    figure.dataset.graphvizEngine ?? fallbackEngine,
  );

  try {
    const svg = renderer.renderString(source, { format: "svg", engine });
    canvas.innerHTML = svg;
    figure.dataset.graphviz = "rendered";
  } catch {
    figure.dataset.graphviz = "error";
    canvas.dataset.graphvizError = "true";
  }
}

async function loadRenderer(
  scriptUrl = DEFAULT_SCRIPT_URL,
): Promise<GraphvizRenderer | null> {
  const existing = (globalThis as { viz?: VizModule }).viz;
  if (existing) return existing.instance();

  const imported = await importModule(scriptUrl);
  return imported.instance();
}

type VizModule = {
  instance(): Promise<GraphvizRenderer>;
};

function importModule(url: string): Promise<VizModule> {
  // A computed specifier keeps `@viz-js/viz` (and its WASM payload) out of the
  // host bundle; it is fetched from the CDN at runtime.
  const importer = new Function("url", "return import(url)") as (
    url: string,
  ) => Promise<VizModule>;
  return importer(url);
}

function normalizeEngine(engine: string | undefined): GraphvizEngine {
  return engine === "neato" ||
    engine === "fdp" ||
    engine === "sfdp" ||
    engine === "circo" ||
    engine === "twopi"
    ? engine
    : DEFAULT_ENGINE;
}
