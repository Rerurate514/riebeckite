import type { ChartConfiguration } from "chart.js";

const CONFIG_ATTRIBUTE_SELECTOR = "canvas[data-chartjs-config]";

/**
 * Draws every server-rendered `canvas[data-chartjs-config]` with Chart.js.
 * The JSON payload is parsed per canvas; a broken payload or a Chart.js error
 * skips that canvas without affecting the rest of the page.
 */
export async function initChartJs(): Promise<void> {
  const canvases = document.querySelectorAll<HTMLCanvasElement>(
    CONFIG_ATTRIBUTE_SELECTOR,
  );
  if (canvases.length === 0) return;

  let Chart: typeof import("chart.js/auto").default;
  try {
    ({ default: Chart } = await import("chart.js/auto"));
  } catch {
    return;
  }

  for (const canvas of Array.from(canvases)) {
    const serialized = canvas.dataset.chartjsConfig;
    if (!serialized) continue;
    let config: ChartConfiguration;
    try {
      config = JSON.parse(serialized) as ChartConfiguration;
    } catch {
      continue;
    }
    try {
      new Chart(canvas, config);
    } catch {
      // Leave this canvas untouched; one bad chart must not stop the rest.
    }
  }
}
