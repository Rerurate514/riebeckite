import type { Browser, Page } from "puppeteer";

export const RENDER_TIMEOUT_MS = 30_000;

export const MERMAID_SCRIPT_SUBPATH = "mermaid/dist/mermaid.min.js";

export const PUPPETEER_PACKAGE = "puppeteer";

export const MERMAID_HEADLESS_MODE = "shell" as const;

export const MERMAID_PUPPETEER_BROWSER = "chrome-headless-shell";

export type MermaidSessionDependencies = {
  /**
   * Overrides browser launch. Tests inject a fake browser so session
   * lifecycle can be asserted without launching Chrome.
   */
  launch?: () => Promise<Browser>;
  timeoutMs?: number;
};

export type SessionState = {
  browser: Browser;
  page: Page;
};

export async function renderMermaidInPage(
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
      deterministicIds: true,
      deterministicIDSeed: id,
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
