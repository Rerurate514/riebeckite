import { access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser, Page } from "puppeteer";
import type {
  MermaidBuildRenderErrorKind,
  MermaidBuildRenderResult,
  MermaidRenderSession,
} from "./types.js";

const RENDER_TIMEOUT_MS = 30_000;
const MERMAID_SCRIPT_SUBPATH = "mermaid/dist/mermaid.min.js";

export type MermaidSessionDependencies = {
  /**
   * Overrides browser launch. Tests inject a fake browser so session
   * lifecycle can be asserted without launching Chrome.
   */
  launch?: () => Promise<Browser>;
};

type SessionState = {
  browser: Browser;
  page: Page;
};

/**
 * Creates a build-scoped Mermaid render session.
 *
 * The session owns one browser + one page and injects `mermaid.min.js` a
 * single time; every diagram render reuses that page through
 * `page.evaluate`. Each `mermaid()` plugin instance creates its own
 * session, so resource ownership stays with the plugin rather than a
 * module-global singleton. `dispose` releases the browser and is wired to
 * the plugin `buildEnd`/`dispose` hooks.
 */
export function createMermaidRenderSession(
  dependencies: MermaidSessionDependencies = {},
): MermaidRenderSession {
  const launchBrowser = dependencies.launch ?? defaultLaunchBrowser;
  let state: SessionState | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  let exitListenerAttached = false;

  // Chromium is a child of this build process. `buildEnd` closes the
  // session on success, but a build that fails before `buildEnd` would
  // otherwise leave the browser running after Node exits.
  const handleExit = (): void => {
    const browser = state?.browser;
    state = null;
    if (!browser) return;
    try {
      browser.process()?.kill();
    } catch {
      // The process is already exiting; nothing further can be done.
    }
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
      const page = await browser.newPage();
      page.setDefaultTimeout(RENDER_TIMEOUT_MS);
      await page.setContent("<!doctype html><html><body></body></html>");
      await page.addScriptTag({ path: await resolveMermaidScriptPath() });
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
    } catch {
      // The browser may already have crashed; cleanup must not mask the
      // original render failure.
    }
  }

  async function teardown(): Promise<void> {
    const current = state;
    state = null;
    detachExitListener();
    if (current) await teardownBrowser(current.browser);
  }

  async function evaluateRender(
    session: SessionState,
    id: string,
    source: string,
    theme: string,
  ): Promise<MermaidBuildRenderResult> {
    const result = await session.page.evaluate(
      renderMermaidInPage,
      id,
      source,
      theme,
    );
    return normalizeRenderResult(result);
  }

  async function renderWithRecovery(
    id: string,
    source: string,
    theme: string,
  ): Promise<MermaidBuildRenderResult> {
    let established = false;
    try {
      const session = await ensureSession();
      established = true;
      return await evaluateRender(session, id, source, theme);
    } catch (error) {
      // Transport failure: the page or browser died, or the session could
      // not start. Reset so the next attempt begins from a clean browser.
      // Invalid diagram syntax never reaches here; it is returned as a
      // structured result from inside the page.
      await teardown();
      if (!established) {
        // Launch/setup failure: report immediately instead of retrying
        // into a known-broken environment.
        return rendererErrorResult(error);
      }
      try {
        const session = await ensureSession();
        return await evaluateRender(session, id, source, theme);
      } catch (retryError) {
        await teardown();
        return rendererErrorResult(retryError);
      }
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
    render(id, source, theme) {
      return enqueue(() => renderWithRecovery(id, source, theme));
    },
    dispose() {
      return enqueue(() => teardown());
    },
  };
}

/**
 * Runs inside the page. Receives id/source/theme as evaluate arguments so
 * no temporary render script has to be written per diagram. Clears the
 * body first so leftover DOM from a previous (possibly failed) render
 * cannot leak into this one.
 */
async function renderMermaidInPage(
  id: string,
  source: string,
  theme: string,
): Promise<unknown> {
  const mermaid = (
    globalThis as typeof globalThis & {
      mermaid?: {
        initialize(options: Record<string, unknown>): void;
        render(
          id: string,
          source: string,
        ): Promise<{ svg: string }> | { svg: string };
      };
    }
  ).mermaid;
  if (!mermaid) {
    return {
      ok: false,
      kind: "renderer-error",
      message: "Mermaid script is not loaded.",
    };
  }
  try {
    document.body.innerHTML = "";
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme,
    });
    const { svg } = await mermaid.render(id, source);
    return { ok: true, svg };
  } catch (error) {
    return {
      ok: false,
      kind: "invalid-diagram",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function defaultLaunchBrowser(): Promise<Browser> {
  const puppeteer = await importPuppeteer();

  return puppeteer.default.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

async function importPuppeteer(): Promise<typeof import("puppeteer")> {
  const importModule = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<typeof import("puppeteer")>;

  return importModule("puppeteer");
}

async function resolveMermaidScriptPath(): Promise<string> {
  const candidates = [
    resolveWithImportMeta(),
    fileURLToPath(
      new URL(`../node_modules/${MERMAID_SCRIPT_SUBPATH}`, import.meta.url),
    ),
    join(process.cwd(), "node_modules", MERMAID_SCRIPT_SUBPATH),
    join(
      process.cwd(),
      "..",
      "..",
      "packages",
      "plugin-mermaid",
      "node_modules",
      MERMAID_SCRIPT_SUBPATH,
    ),
  ].filter((path): path is string => typeof path === "string");

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }

  return candidates.at(0) ?? MERMAID_SCRIPT_SUBPATH;
}

function resolveWithImportMeta(): string | undefined {
  const resolver = import.meta.resolve;
  if (typeof resolver !== "function") return undefined;
  return fileURLToPath(resolver(MERMAID_SCRIPT_SUBPATH));
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function rendererErrorResult(error: unknown): MermaidBuildRenderResult {
  return { ok: false, kind: "renderer-error", message: formatError(error) };
}

function normalizeRenderResult(value: unknown): MermaidBuildRenderResult {
  if (!value || typeof value !== "object") {
    return {
      ok: false,
      kind: "renderer-error",
      message: "Mermaid renderer returned no result.",
    };
  }

  const result = value as Partial<MermaidBuildRenderResult>;
  if (result.ok === true && typeof result.svg === "string") {
    return { ok: true, svg: result.svg };
  }

  if (result.ok === false) {
    return {
      ok: false,
      kind: normalizeErrorKind(result.kind),
      message:
        typeof result.message === "string"
          ? result.message
          : "Mermaid renderer failed.",
    };
  }

  return {
    ok: false,
    kind: "renderer-error",
    message: "Mermaid renderer returned an invalid result.",
  };
}

function normalizeErrorKind(value: unknown): MermaidBuildRenderErrorKind {
  return value === "invalid-diagram" || value === "renderer-error"
    ? value
    : "renderer-error";
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
