import { renderPendingDiagrams } from "@riebeckite/diagram/client";
import type { ChartConfiguration } from "chart.js";

type ClientContext = { root?: ParentNode; signal?: AbortSignal };

export async function initChartJs(
  context: ClientContext = {},
): Promise<undefined | (() => void)> {
  let Chart: typeof import("chart.js/auto").default;
  try {
    ({ default: Chart } = await import("chart.js/auto"));
  } catch {
    return;
  }
  if (context.signal?.aborted) return;

  return await renderPendingDiagrams(
    "chartjs",
    (figure) => {
      const canvas = figure.querySelector<HTMLCanvasElement>(
        "canvas[data-diagram-content]",
      );
      const serialized = canvas?.dataset.diagramConfig;
      if (!canvas || !serialized)
        throw new Error("Missing chart configuration.");
      const config = JSON.parse(serialized) as ChartConfiguration;
      const chart = new Chart(canvas, config);
      return () => chart.destroy();
    },
    context,
  );
}
