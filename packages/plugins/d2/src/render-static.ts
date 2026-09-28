import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { D2BuildRenderResult, D2Layout } from "./types.js";

const RENDER_TIMEOUT_MS = 30_000;
const D2_PACKAGE = "@d2lang/d2";

type D2Renderer = {
  compile(
    source: string,
    options?: Record<string, unknown>,
  ): Promise<{
    diagram: unknown;
    renderOptions?: Record<string, unknown>;
  }>;
  render(
    diagram: unknown,
    options?: Record<string, unknown>,
  ): Promise<string> | string;
  dispose?(): Promise<void> | void;
};

type D2RendererModule = {
  D2: new () => D2Renderer;
};

class D2TimeoutError extends Error {}

let renderQueue: Promise<unknown> = Promise.resolve();

export async function renderD2StaticSvg(
  id: string,
  source: string,
  options: { themeID: number; layout: D2Layout },
): Promise<D2BuildRenderResult> {
  return enqueueD2Render(async () => {
    let renderer: D2Renderer | undefined;
    try {
      const module = await importD2Module();
      renderer = new module.D2();
    } catch (error) {
      return {
        ok: false,
        kind: "renderer-error",
        message: `Failed to load the D2 renderer: ${formatError(error)}`,
      };
    }

    try {
      let compiled: Awaited<ReturnType<D2Renderer["compile"]>>;
      try {
        compiled = await withTimeout(
          renderer.compile(source, {
            layout: options.layout,
            themeID: options.themeID,
            salt: id,
          }),
          "D2 compilation timed out.",
        );
      } catch (error) {
        return {
          ok: false,
          kind:
            error instanceof D2TimeoutError
              ? "renderer-error"
              : "invalid-diagram",
          message: formatError(error),
        };
      }

      let svg: string;
      try {
        svg = await withTimeout(
          Promise.resolve(
            renderer.render(compiled.diagram, {
              ...compiled.renderOptions,
              noXMLTag: true,
            }),
          ),
          "D2 rendering timed out.",
        );
      } catch (error) {
        return {
          ok: false,
          kind: "renderer-error",
          message: formatError(error),
        };
      }

      if (typeof svg !== "string" || !svg.includes("<svg")) {
        return {
          ok: false,
          kind: "renderer-error",
          message: "D2 renderer returned an invalid SVG.",
        };
      }

      return { ok: true, svg };
    } finally {
      if (typeof renderer.dispose === "function") {
        try {
          await renderer.dispose();
        } catch {
          // The worker is already gone; nothing else to release.
        }
      }
    }
  });
}

/**
 * Loads D2.js without letting a bundler inline the Node/WASM entry point into
 * the browser client. The indirection keeps the specifier out of static
 * analysis while still resolving through normal Node ESM resolution.
 *
 * When a host bundles the Riebeckite config into a temporary module, the bare
 * specifier no longer resolves from that temporary location. In that case the
 * package is resolved from the process working directory instead.
 */
async function importD2Module(): Promise<D2RendererModule> {
  const importModule = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<unknown>;

  try {
    return normalizeD2Module(await importModule(D2_PACKAGE));
  } catch (error) {
    const fallback = resolveD2FromWorkingDirectory();
    if (!fallback) throw error;
    return normalizeD2Module(await importModule(fallback));
  }
}

function normalizeD2Module(value: unknown): D2RendererModule {
  const module = value as {
    D2?: unknown;
    default?: { D2?: unknown };
  };
  const D2 = typeof module?.D2 === "function" ? module.D2 : module?.default?.D2;
  if (typeof D2 !== "function") {
    throw new Error("The D2 module did not export a D2 class.");
  }
  return { D2: D2 as D2RendererModule["D2"] };
}

function resolveD2FromWorkingDirectory(): string | null {
  try {
    const require = createRequire(join(process.cwd(), "package.json"));
    const resolved = require.resolve(D2_PACKAGE);
    const esm = resolved
      .replace(/dist[\\/]node-cjs[\\/]index\.js$/, "dist/node-esm/index.js")
      .replace(/dist[\\/]cjs[\\/]index\.js$/, "dist/esm/index.js");
    const target = esm !== resolved && existsSync(esm) ? esm : resolved;
    return pathToFileURL(target).href;
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new D2TimeoutError(message)),
      RENDER_TIMEOUT_MS,
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

async function enqueueD2Render<T>(render: () => Promise<T>): Promise<T> {
  const current = renderQueue.then(render, render);
  renderQueue = current.catch(() => undefined);
  return current;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
