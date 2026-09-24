import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser } from "puppeteer";
import type {
  MermaidBuildRenderErrorKind,
  MermaidBuildRenderResult,
} from "./types.js";

const RENDER_TIMEOUT_MS = 30_000;
const MERMAID_SCRIPT_SUBPATH = "mermaid/dist/mermaid.min.js";

let renderQueue: Promise<unknown> = Promise.resolve();

export async function renderMermaidStaticSvg(
  id: string,
  source: string,
  theme: string,
): Promise<MermaidBuildRenderResult> {
  return enqueueMermaidRender(async () => {
    const workDir = await mkdtemp(join(tmpdir(), "riebeckite-mermaid-"));
    const scriptPath = join(workDir, "render-mermaid.js");

    try {
      await writeFile(scriptPath, buildRenderScript(id, source, theme), "utf8");
      return await renderWithBrowser(scriptPath);
    } finally {
      await rm(workDir, { force: true, recursive: true });
    }
  });
}

async function renderWithBrowser(
  scriptPath: string,
): Promise<MermaidBuildRenderResult> {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addScriptTag({ path: await resolveMermaidScriptPath() });
    await page.addScriptTag({ path: scriptPath });

    const result = await page.evaluate(() => {
      return (globalThis as typeof globalThis & { __rrMermaidResult?: unknown })
        .__rrMermaidResult;
    });

    return normalizeRenderResult(result);
  } catch (error) {
    return {
      ok: false,
      kind: "renderer-error",
      message: formatError(error),
    };
  } finally {
    await page.close();
    await browser.close();
  }
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

async function launchBrowser(): Promise<Browser> {
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

function buildRenderScript(id: string, source: string, theme: string): string {
  return `
    (async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: ${JSON.stringify(theme)},
        });
        const { svg } = await mermaid.render(
          ${JSON.stringify(id)},
          ${JSON.stringify(source)},
        );
        globalThis.__rrMermaidResult = { ok: true, svg };
      } catch (error) {
        globalThis.__rrMermaidResult = {
          ok: false,
          kind: "invalid-diagram",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    })();
  `;
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

async function enqueueMermaidRender<T>(render: () => Promise<T>): Promise<T> {
  const current = renderQueue.then(render, render);

  renderQueue = current.catch(() => undefined);

  return current;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
