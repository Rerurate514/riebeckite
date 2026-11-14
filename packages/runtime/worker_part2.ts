import {
  RuntimeUnsupportedError,
  RuntimeWasmError,
} from "./src/core/errors.js";
import {
  type RuntimeMessageScope,
  serveWorkerRuntime,
  type WasmWorkerInit,
} from "./worker_part1.js";

export type WasmWorkerHostOptions = {
  readonly imports?: WebAssembly.Imports;
  readonly fetch?: (input: RequestInfo | URL) => Promise<Response>;
  readonly allowCrossOrigin?: boolean;
  readonly streaming?: boolean;
};

export type WasmExport = (...args: unknown[]) => unknown;

export function serveWasmWorkerRuntime(
  scope: RuntimeMessageScope,
  options: WasmWorkerHostOptions = {},
): () => void {
  let exportFunction: WasmExport | undefined;
  let instance: WebAssembly.Instance | undefined;

  return serveWorkerRuntime<readonly unknown[], unknown>(scope, {
    async initialize(init) {
      const config = parseWasmInit(init);
      if (typeof WebAssembly === "undefined") {
        throw new RuntimeUnsupportedError(
          "This browser does not support WebAssembly.",
        );
      }
      const base =
        (globalThis as { location?: { href?: string } }).location?.href ??
        "http://localhost/";
      const url = new URL(config.wasmUrl, base);
      if (!options.allowCrossOrigin && url.origin !== new URL(base).origin) {
        throw new RuntimeWasmError(
          `WASM asset "${config.wasmUrl}" must be served from the same origin.`,
        );
      }
      const loaded = await loadWasm(url, options);
      instance = loaded.instance;
      const candidate = instance.exports[config.exportName];
      if (typeof candidate !== "function") {
        throw new RuntimeWasmError(
          `WASM module does not export the "${config.exportName}" function.`,
        );
      }
      exportFunction = candidate as WasmExport;
    },
    invoke(input) {
      if (!exportFunction) {
        throw new RuntimeWasmError("WASM module is not initialized.");
      }
      const args = Array.isArray(input) ? input : [input];
      try {
        return Reflect.apply(exportFunction, undefined, args);
      } catch (error) {
        if (isWasmTrap(error)) {
          throw new RuntimeWasmError("WASM module trapped during execution.", {
            trap: true,
            cause: error,
          });
        }
        throw error;
      }
    },
    dispose() {
      exportFunction = undefined;
      instance = undefined;
    },
  });
}

export async function loadWasm(
  url: URL,
  options: WasmWorkerHostOptions,
): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  const fetcher = options.fetch ?? globalThis.fetch;
  if (!fetcher) {
    throw new RuntimeUnsupportedError(
      "Fetch is unavailable; the WASM asset cannot be loaded.",
    );
  }
  const imports = options.imports ?? {};
  const response = await fetcher(url);
  if (!response.ok) {
    throw new RuntimeWasmError(
      `WASM asset "${url.pathname}" responded with ${response.status}.`,
    );
  }
  if (
    options.streaming !== false &&
    typeof WebAssembly.instantiateStreaming === "function"
  ) {
    try {
      return await WebAssembly.instantiateStreaming(response.clone(), imports);
    } catch {
      // Some servers omit application/wasm; fall back to an ArrayBuffer.
    }
  }
  const bytes = await response.arrayBuffer();
  try {
    return await WebAssembly.instantiate(bytes, imports);
  } catch (error) {
    throw new RuntimeWasmError(
      "WASM module could not be compiled; check the content type and CSP.",
      { cause: error },
    );
  }
}

export function parseWasmInit(init: unknown): WasmWorkerInit {
  if (!init || typeof init !== "object") {
    throw new RuntimeWasmError("WASM runtime init payload is missing.");
  }
  const config = init as Record<string, unknown>;
  if (typeof config.wasmUrl !== "string" || !config.wasmUrl) {
    throw new RuntimeWasmError("WASM runtime init requires a wasmUrl.");
  }
  if (typeof config.exportName !== "string" || !config.exportName) {
    throw new RuntimeWasmError("WASM runtime init requires an exportName.");
  }
  return { wasmUrl: config.wasmUrl, exportName: config.exportName };
}

export function isWasmTrap(error: unknown): boolean {
  if (error instanceof Error && error.name === "RuntimeError") return true;
  return (
    typeof WebAssembly !== "undefined" &&
    typeof WebAssembly.RuntimeError === "function" &&
    error instanceof WebAssembly.RuntimeError
  );
}
