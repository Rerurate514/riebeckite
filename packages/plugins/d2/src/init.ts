import type { D2ClientOptions, D2InstanceApi, D2Theme } from "./types.js";

const DEFAULT_THEME: NonNullable<D2Theme> = { light: 0, dark: 1 };
const DEFAULT_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/@d2lang/d2@0.1.34/dist/browser/index.js";

/**
 * Renders every pending D2 figure in the document.
 *
 * The initializer is intentionally dependency-free at bundle time: D2.js is
 * imported from `moduleUrl` in the browser, so a site that renders D2 at build
 * time never ships the WASM renderer to visitors unless it opts into the
 * `"client"` render mode.
 */
export async function initD2Diagrams(options: D2ClientOptions = {}) {
  const figures = Array.from(
    document.querySelectorAll<HTMLElement>('[data-d2="pending"]'),
  );
  if (figures.length === 0) return;

  const api = options.api ?? (await loadD2(options.moduleUrl));
  if (!api) return;

  const renderer = new api.D2();
  try {
    for (const [index, figure] of figures.entries()) {
      await renderFigure(renderer, figure, index, options);
    }
  } finally {
    await renderer.dispose?.();
  }
}

async function renderFigure(
  renderer: D2InstanceApi,
  figure: HTMLElement,
  index: number,
  options: D2ClientOptions,
) {
  const source = figure.dataset.d2Source;
  const canvas = figure.querySelector<HTMLElement>("[data-d2-canvas]");
  if (!source || !canvas) return;

  try {
    const compiled = await renderer.compile(source, {
      layout: options.layout ?? figure.dataset.d2Layout ?? "dagre",
      themeID: selectTheme(options.theme ?? DEFAULT_THEME),
      salt: `rb-d2-client-${index}`,
    });
    const svg = await renderer.render(compiled.diagram, {
      ...compiled.renderOptions,
      noXMLTag: true,
    });
    canvas.innerHTML = svg;
    figure.dataset.d2 = "rendered";
  } catch {
    figure.dataset.d2 = "error";
  }
}

async function loadD2(
  moduleUrl = DEFAULT_MODULE_URL,
): Promise<D2ClientOptions["api"]> {
  const injected = (globalThis as { d2?: D2ClientOptions["api"] }).d2;
  if (injected) return injected;

  try {
    const imported = (await import(/* @vite-ignore */ moduleUrl)) as {
      D2?: unknown;
    };
    if (typeof imported?.D2 !== "function") return undefined;
    return imported as D2ClientOptions["api"];
  } catch {
    return undefined;
  }
}

function selectTheme(theme: D2Theme): number {
  if (typeof theme === "number") return theme;
  return prefersDark() ? theme.dark : theme.light;
}

function prefersDark(): boolean {
  return document.documentElement.dataset.theme === "dark"
    ? true
    : document.documentElement.dataset.theme === "light"
      ? false
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
}
