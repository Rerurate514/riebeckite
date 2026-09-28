import { renderExcaliBrainSvg } from "./render.js";
import type {
  ExcaliBrainClientOptions,
  ExcaliBrainGraph,
  ExcaliBrainLayout,
} from "./types.js";

type ExcaliBrainPayload = {
  graph: ExcaliBrainGraph;
  layout: ExcaliBrainLayout;
  className?: string;
};

/**
 * Build the SVG for every client-rendered ExcaliBrain canvas. Canvases that
 * already contain a build-time SVG (the `both` mode) are left untouched.
 */
export function initExcaliBrain(options: ExcaliBrainClientOptions = {}): void {
  const canvases = document.querySelectorAll<HTMLElement>(
    "[data-excalibrain-payload]",
  );

  for (const canvas of canvases) {
    if (canvas.querySelector(".rb-excalibrain__svg")) continue;

    const payload = canvas.dataset.excalibrainPayload;
    if (!payload) continue;

    try {
      const parsed = JSON.parse(payload) as ExcaliBrainPayload;
      canvas.innerHTML = renderExcaliBrainSvg(parsed.graph, parsed.layout, {
        className: options.className ?? parsed.className,
      });
      canvas.removeAttribute("data-excalibrain-payload");
    } catch {
      canvas.dataset.excalibrainError = "true";
    }
  }
}
