import type {
  GraphvizBuildRenderErrorKind,
  GraphvizBuildRenderResult,
} from "./types.js";

type VizInstance = {
  renderString(
    source: string,
    options: { format: "svg"; engine: string },
  ): string;
};

/**
 * Graphviz layout engines are stateless once the WASM module is instantiated,
 * so the instance is created lazily and reused. `@viz-js/viz` is imported
 * dynamically so that neither the WASM loader nor the `.wasm` payload ever
 * reaches the client bundle; it runs only in the Node build process.
 */
let vizPromise: Promise<VizInstance> | undefined;
let renderQueue: Promise<unknown> = Promise.resolve();

export async function renderGraphvizStaticSvg(
  source: string,
  engine: string,
): Promise<GraphvizBuildRenderResult> {
  return enqueue(async () => {
    let viz: VizInstance;
    try {
      viz = await loadViz();
    } catch (error) {
      return {
        ok: false,
        kind: "renderer-error",
        message: formatError(error),
      };
    }

    try {
      const rendered = viz.renderString(source, { format: "svg", engine });
      return { ok: true, svg: toInlineSvg(rendered) };
    } catch (error) {
      return {
        ok: false,
        kind: classifyRenderError(error),
        message: formatError(error),
      };
    }
  });
}

async function loadViz(): Promise<VizInstance> {
  if (!vizPromise) {
    vizPromise = (async () => {
      const { instance } = await import("@viz-js/viz");
      return instance();
    })();
  }
  return vizPromise;
}

/**
 * Rendering errors thrown by Graphviz itself describe invalid DOT (syntax or
 * semantic). Failures while loading/instantiating the WASM module are reported
 * as renderer errors.
 */
function classifyRenderError(error: unknown): GraphvizBuildRenderErrorKind {
  return error instanceof Error ? "invalid-diagram" : "renderer-error";
}

/**
 * Graphviz emits an XML prolog and a DOCTYPE before `<svg>`. Both are invalid
 * inside an HTML document body, so the markup is trimmed to the SVG element
 * itself before it is inlined.
 */
function toInlineSvg(rendered: string): string {
  const start = rendered.indexOf("<svg");
  if (start < 0) return rendered;
  const end = rendered.lastIndexOf("</svg>");
  return end < 0 ? rendered.slice(start) : rendered.slice(start, end + 6);
}

async function enqueue<T>(render: () => Promise<T>): Promise<T> {
  const current = renderQueue.then(render, render);
  renderQueue = current.catch(() => undefined);
  return current;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
