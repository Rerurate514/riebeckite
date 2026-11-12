import {
  renderPendingDiagrams,
  setDiagramSvg,
} from "@riebeckite/diagram/client";
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
export async function initExcaliBrain(
  context: ExcaliBrainClientOptions & {
    root?: ParentNode;
    signal?: AbortSignal;
  } = {},
): Promise<undefined | (() => void)> {
  const options = context;
  return await renderPendingDiagrams(
    "excalibrain",
    (canvas) => {
      if (canvas.querySelector(".rb-excalibrain__svg")) return;

      const payload = canvas.dataset.excalibrainPayload;
      if (!payload) throw new Error("Missing ExcaliBrain payload.");

      try {
        const parsed = JSON.parse(payload) as ExcaliBrainPayload;
        if (
          !setDiagramSvg(
            canvas,
            renderExcaliBrainSvg(parsed.graph, parsed.layout, {
              className: options.className ?? parsed.className,
            }),
          )
        ) {
          throw new Error("Invalid SVG output.");
        }
        canvas.removeAttribute("data-excalibrain-payload");
      } catch (error) {
        canvas.dataset.excalibrainError = "true";
        throw error;
      }
    },
    {
      ...context,
      selector: "[data-excalibrain-payload]",
      fallbackSelector: "details",
    },
  );
}
