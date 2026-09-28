import type { EmbedOptions } from "vega-embed";

const FIGURE_SELECTOR = "[data-vega-lite]";
const CANVAS_SELECTOR = "[data-vega-lite-canvas]";

type EmbedFunction = typeof import("vega-embed").default;

/**
 * Renders every server-emitted `[data-vega-lite]` figure in the browser.
 *
 * The spec travels in a `data-vega-lite-spec` attribute, so the heavy Vega
 * runtime is imported dynamically and the page still renders (as a fallback
 * `<details>`) when JavaScript is disabled. A broken payload or a Vega error
 * reveals the fallback for that figure without affecting the rest of the page.
 */
export async function initVegaLite(): Promise<void> {
  const figures = Array.from(
    document.querySelectorAll<HTMLElement>(FIGURE_SELECTOR),
  );
  if (figures.length === 0) return;

  let embed: EmbedFunction;
  try {
    // `vega` and `vega-lite` are imported alongside `vega-embed` so the same
    // runtime backs the embed call and the peer dependencies are preloaded.
    const [, , vegaEmbed] = await Promise.all([
      import("vega"),
      import("vega-lite"),
      import("vega-embed"),
    ]);
    embed = vegaEmbed.default;
  } catch {
    for (const figure of figures) revealFallback(figure);
    return;
  }

  for (const figure of figures) {
    await renderFigure(embed, figure);
  }
}

async function renderFigure(embed: EmbedFunction, figure: HTMLElement) {
  const canvas = figure.querySelector<HTMLElement>(CANVAS_SELECTOR);
  const serialized = figure.dataset.vegaLiteSpec;
  if (!canvas || !serialized) {
    revealFallback(figure);
    return;
  }

  let spec: unknown;
  try {
    spec = JSON.parse(serialized);
  } catch {
    revealFallback(figure);
    return;
  }

  try {
    await embed(
      canvas,
      spec as Parameters<EmbedFunction>[1],
      buildEmbedOptions(figure),
    );
    figure.dataset.vegaLite = "rendered";
  } catch {
    revealFallback(figure);
  }
}

function buildEmbedOptions(figure: HTMLElement): EmbedOptions {
  const options: EmbedOptions = {};

  const actions = figure.dataset.vegaLiteActions;
  if (actions === "true") options.actions = true;
  else if (actions === "false") options.actions = false;

  if (figure.dataset.vegaLiteTheme === "dark") options.theme = "dark";

  const renderer = figure.dataset.vegaLiteRenderer;
  if (renderer === "canvas" || renderer === "svg") options.renderer = renderer;

  return options;
}

function revealFallback(figure: HTMLElement) {
  figure.dataset.vegaLite = "error";
  const fallback = figure.querySelector<HTMLDetailsElement>("details");
  if (fallback) fallback.open = true;
}
