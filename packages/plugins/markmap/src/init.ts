import type {
  MarkmapAssets,
  MarkmapClientOptions,
  MarkmapRuntime,
} from "./types.js";

const DEFAULT_CLASS_NAME = "rb-markmap";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * Pinned CDN builds. The versions mirror the package `dependencies`; the
 * initializer fetches them at runtime with a computed specifier so neither
 * `markmap-lib` nor `markmap-view` (and their transitive `d3`/KaTeX/Prism
 * payloads) is pulled into the host's client bundle at build time.
 */
const DEFAULT_LIB_URL = "https://cdn.jsdelivr.net/npm/markmap-lib@0.18.12/+esm";
const DEFAULT_VIEW_URL =
  "https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/+esm";

/**
 * Renders every server-emitted `[data-markmap="pending"]` figure in the
 * browser.
 *
 * The Markdown source travels in `data-markmap-source`, so the page still
 * renders (with the fallback `<details>`) when JavaScript is disabled.
 */
export async function initMarkmap(
  options: MarkmapClientOptions = {},
): Promise<void> {
  const baseClass = options.className?.trim() || DEFAULT_CLASS_NAME;
  const figures = Array.from(
    document.querySelectorAll<HTMLElement>('[data-markmap="pending"]'),
  );
  if (figures.length === 0) return;

  const runtime = await loadRuntime(options);
  if (!runtime) {
    for (const figure of figures) setError(figure);
    return;
  }

  for (const figure of figures) {
    await renderFigure(runtime, figure, baseClass);
  }
}

async function renderFigure(
  runtime: MarkmapRuntime,
  figure: HTMLElement,
  baseClass: string,
): Promise<void> {
  const canvas = figure.querySelector<HTMLElement>(
    `[data-markmap-canvas], .${baseClass}__canvas`,
  );
  const source = figure.dataset.markmapSource;
  if (!canvas || !source) {
    setError(figure);
    return;
  }

  try {
    const transformer = new runtime.Transformer();
    const result = transformer.transform(source);
    await loadAssets(runtime, transformer.getUsedAssets(result.features));

    const svg = ensureSvg(canvas, baseClass, figure.dataset.markmapHeight);
    const markmapOptions = buildOptions(
      runtime,
      figure.dataset.markmapColorFreezeLevel,
      result.frontmatter?.markmap,
    );
    runtime.Markmap.create(svg, markmapOptions, result.root);
    figure.dataset.markmap = "rendered";
  } catch {
    setError(figure);
  }
}

function ensureSvg(
  canvas: HTMLElement,
  baseClass: string,
  height: string | undefined,
): SVGElement {
  const existing = canvas.querySelector<SVGSVGElement>("svg");
  if (existing) return existing;

  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("class", `${baseClass}__svg`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", height && Number(height) > 0 ? height : "320");
  svg.setAttribute("role", "presentation");
  canvas.append(svg);
  return svg;
}

function buildOptions(
  runtime: MarkmapRuntime,
  colorFreezeLevel: string | undefined,
  frontmatterOptions: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const json: Record<string, unknown> = { ...(frontmatterOptions ?? {}) };
  const freeze = readNumber(colorFreezeLevel);
  if (freeze !== undefined) json.colorFreezeLevel = freeze;

  return runtime.deriveOptions ? runtime.deriveOptions(json) : json;
}

async function loadAssets(
  runtime: MarkmapRuntime,
  assets: MarkmapAssets,
): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (runtime.loadJS && assets.scripts?.length) {
    tasks.push(runtime.loadJS(assets.scripts));
  }
  if (runtime.loadCSS && assets.styles?.length) {
    tasks.push(runtime.loadCSS(assets.styles));
  }
  // Missing highlight/KaTeX assets must not prevent the map from rendering.
  await Promise.all(tasks).catch(() => undefined);
}

async function loadRuntime(
  options: MarkmapClientOptions,
): Promise<MarkmapRuntime | null> {
  if (options.runtime) return options.runtime;

  try {
    const [lib, view] = await Promise.all([
      importModule(options.libUrl ?? DEFAULT_LIB_URL),
      importModule(options.viewUrl ?? DEFAULT_VIEW_URL),
    ]);

    const Transformer = readExport(lib, "Transformer");
    const Markmap = readExport(view, "Markmap");
    if (typeof Transformer !== "function" || !Markmap) return null;

    return {
      Transformer: Transformer as MarkmapRuntime["Transformer"],
      Markmap: Markmap as MarkmapRuntime["Markmap"],
      deriveOptions: readExport(view, "deriveOptions") as
        | MarkmapRuntime["deriveOptions"]
        | undefined,
      loadJS: readExport(view, "loadJS") as MarkmapRuntime["loadJS"],
      loadCSS: readExport(view, "loadCSS") as MarkmapRuntime["loadCSS"],
    };
  } catch {
    return null;
  }
}

function importModule(url: string): Promise<Record<string, unknown>> {
  // A computed specifier keeps the renderer out of the host bundle; it is
  // fetched from the CDN at runtime.
  const importer = new Function("url", "return import(url)") as (
    url: string,
  ) => Promise<Record<string, unknown>>;
  return importer(url);
}

function readExport(module: Record<string, unknown>, name: string): unknown {
  if (name in module) return module[name];
  const fallback = module.default as Record<string, unknown> | undefined;
  return fallback?.[name];
}

function readNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function setError(figure: HTMLElement) {
  figure.dataset.markmap = "error";
  const fallback = figure.querySelector<HTMLDetailsElement>("details");
  if (fallback) fallback.open = true;
}
