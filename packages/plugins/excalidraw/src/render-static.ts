import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Browser, Page } from "puppeteer";
import type { ExcalidrawScene } from "./types.js";

const RENDER_TIMEOUT_MS = 60_000;
const PUPPETEER_PACKAGE = "puppeteer";

type ExcalidrawSessionDependencies = {
  launch?: () => Promise<Browser>;
  createBundle?: () => Promise<string>;
  timeoutMs?: number;
};

export type ExcalidrawRenderSession = {
  render(scene: ExcalidrawScene): Promise<string>;
  dispose(): Promise<void>;
};

type SessionState = {
  browser: Browser;
  page: Page;
};

export function createExcalidrawRenderSession(
  dependencies: ExcalidrawSessionDependencies = {},
): ExcalidrawRenderSession {
  const launchBrowser = dependencies.launch ?? defaultLaunchBrowser;
  const createBundle = dependencies.createBundle ?? bundleExporter;
  const timeoutMs = dependencies.timeoutMs ?? RENDER_TIMEOUT_MS;
  let state: SessionState | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  let exitListenerAttached = false;

  const handleExit = (): void => {
    const browser = state?.browser;
    state = null;
    if (!browser) return;
    try {
      browser.process()?.kill();
    } catch {}
  };

  function attachExitListener(): void {
    if (exitListenerAttached) return;
    process.once("exit", handleExit);
    exitListenerAttached = true;
  }

  function detachExitListener(): void {
    if (!exitListenerAttached) return;
    process.removeListener("exit", handleExit);
    exitListenerAttached = false;
  }

  async function ensureSession(): Promise<SessionState> {
    if (state) return state;
    const browser = await launchBrowser();
    attachExitListener();
    try {
      const bundle = await createBundle();
      const page = await browser.newPage();
      page.setDefaultTimeout(timeoutMs);
      await page.setContent("<!doctype html><html><body></body></html>");
      await page.addScriptTag({ content: bundle });
      state = { browser, page };
      return state;
    } catch (error) {
      await teardownBrowser(browser);
      detachExitListener();
      throw error;
    }
  }

  async function teardownBrowser(browser: Browser): Promise<void> {
    try {
      await browser.close();
    } catch {}
  }

  async function teardown(): Promise<void> {
    const current = state;
    state = null;
    detachExitListener();
    if (current) await teardownBrowser(current.browser);
  }

  async function renderScene(scene: ExcalidrawScene): Promise<string> {
    try {
      const session = await ensureSession();
      const result = await withTimeout(
        session.page.evaluate(exportSceneInPage, scene),
        timeoutMs,
        "Excalidraw rendering timed out.",
      );
      return normalizeRenderResult(result);
    } catch (error) {
      await teardown();
      throw error;
    }
  }

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return {
    render(scene) {
      return enqueue(() => renderScene(scene));
    },
    dispose() {
      return enqueue(teardown);
    },
  };
}

async function exportSceneInPage(scene: ExcalidrawScene): Promise<unknown> {
  const renderer = (
    globalThis as typeof globalThis & {
      __excalidraw?: {
        exportToSvg(options: {
          elements: readonly unknown[];
          appState: Record<string, unknown>;
          files: Record<string, unknown>;
        }): Promise<SVGSVGElement>;
      };
    }
  ).__excalidraw;
  if (!renderer) {
    return { ok: false, message: "Excalidraw renderer is not loaded." };
  }

  try {
    const appState = scene.appState ?? {};
    const svg = await renderer.exportToSvg({
      elements: scene.elements,
      appState: {
        ...appState,
        exportBackground: appState.exportBackground ?? false,
        viewBackgroundColor: appState.viewBackgroundColor ?? "#ffffff",
      },
      files: scene.files ?? {},
    });
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    return { ok: true, svg: svg.outerHTML };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function normalizeRenderResult(value: unknown): string {
  if (!value || typeof value !== "object") {
    throw new Error("Excalidraw renderer returned no result.");
  }

  const result = value as { ok?: unknown; svg?: unknown; message?: unknown };
  if (
    result.ok === true &&
    typeof result.svg === "string" &&
    result.svg.trimStart().startsWith("<svg")
  ) {
    return result.svg;
  }

  throw new Error(
    typeof result.message === "string"
      ? result.message
      : "Excalidraw renderer returned an invalid result.",
  );
}

async function bundleExporter(): Promise<string> {
  const esbuild = await importEsbuild();
  const entry = resolvePackageEntry("@excalidraw/excalidraw");
  const result = await esbuild.build({
    stdin: {
      contents: 'export { exportToSvg } from "@excalidraw/excalidraw";',
      resolveDir: dirname(entry),
      loader: "js",
    },
    bundle: true,
    format: "iife",
    globalName: "__excalidraw",
    platform: "browser",
    minify: true,
    define: { "process.env.NODE_ENV": '"production"' },
    write: false,
    logLevel: "silent",
  });

  const bundle = result.outputFiles?.[0]?.text;
  if (!bundle) throw new Error("Excalidraw renderer bundle was empty.");
  return bundle;
}

async function defaultLaunchBrowser(): Promise<Browser> {
  const puppeteer = await importPuppeteer();

  try {
    return await puppeteer.default.launch({
      headless: "shell",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Could not find|not found|ENOENT/i.test(message)) {
      throw new Error(
        `Could not launch chrome-headless-shell. Install it with "puppeteer browsers install chrome-headless-shell". ${message}`,
        { cause: error },
      );
    }
    throw error;
  }
}

async function importEsbuild(): Promise<typeof import("esbuild")> {
  return importDependency<typeof import("esbuild")>("esbuild");
}

async function importPuppeteer(): Promise<typeof import("puppeteer")> {
  return importDependency<typeof import("puppeteer")>(PUPPETEER_PACKAGE);
}

async function importDependency<T>(specifier: string): Promise<T> {
  const importModule = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<T>;

  try {
    return await importModule(specifier);
  } catch (error) {
    const fallback = resolveFromWorkingDirectory(specifier);
    if (!fallback) throw error;
    return importModule(fallback);
  }
}

function resolveFromWorkingDirectory(specifier: string): string | null {
  const rootRequire = createRequire(`${process.cwd()}/package.json`);
  try {
    return pathToFileURL(rootRequire.resolve(specifier)).href;
  } catch {}

  try {
    const pluginEntry = rootRequire.resolve("@riebeckite/plugin-excalidraw");
    return pathToFileURL(createRequire(pluginEntry).resolve(specifier)).href;
  } catch {
    return null;
  }
}

function resolvePackageEntry(specifier: string): string {
  const resolved = resolveFromWorkingDirectory(specifier);
  if (resolved) return fileURLToPath(resolved);
  return createRequire(import.meta.url).resolve(specifier);
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}
