import type { MarpBuildRenderResult } from "./types.js";

const DEFAULT_THEME = "default";

/**
 * Minimal structural types for Marp Core. The package is loaded lazily at
 * build time so it never reaches the client bundle, and the plugin only relies
 * on the small surface it actually uses.
 */
type MarpCoreTheme = {
  name?: string;
};

type MarpCoreInstance = {
  render(markdown: string): { html: string; css: string };
  themeSet: {
    get(name: string): MarpCoreTheme | undefined;
    default: MarpCoreTheme;
  };
};

type MarpCoreConstructor = new (
  options: Record<string, unknown>,
) => MarpCoreInstance;

type MarpCoreModule = {
  Marp?: MarpCoreConstructor;
  default?: unknown;
};

export type MarpRenderRequest = {
  theme: string;
  allowHtml: boolean;
  math: boolean;
  /** Only forwarded to Marp Core when the user set it explicitly. */
  inlineSVG?: boolean;
  deckClassName: string;
};

/**
 * Explicit build-time boundary for the Marp renderer. Markdown/HTML pipeline
 * code depends only on this contract, never on `@marp-team/marp-core` types.
 */
export async function renderMarpDeck(
  markdown: string,
  request: MarpRenderRequest,
): Promise<MarpBuildRenderResult> {
  try {
    const Marp = await loadMarpCore();
    const marpOptions: Record<string, unknown> = {
      html: request.allowHtml,
      math: request.math,
      // Slides are emitted as static HTML: no client script is required.
      script: false,
      minifyCSS: true,
      container: { tag: "div", class: request.deckClassName },
    };
    // Marp Core defaults to SVG slide wrappers; only override when asked.
    if (request.inlineSVG !== undefined) {
      marpOptions.inlineSVG = request.inlineSVG;
    }
    const marp = new Marp(marpOptions);

    let warning: string | undefined;
    if (request.theme && request.theme !== DEFAULT_THEME) {
      const theme = marp.themeSet.get(request.theme);
      if (theme) {
        marp.themeSet.default = theme;
      } else {
        warning = `Unknown Marp theme "${request.theme}"; using the default theme.`;
      }
    }

    const { html, css } = marp.render(markdown);
    return {
      ok: true,
      deck: { html, css, slides: countSlides(html) },
      ...(warning === undefined ? {} : { warning }),
    };
  } catch (error) {
    return { ok: false, message: formatError(error) };
  }
}

async function loadMarpCore(): Promise<MarpCoreConstructor> {
  const module = await importMarpCore();
  const Marp = module.Marp ?? module.default;
  if (typeof Marp !== "function") {
    throw new Error("Marp Core did not expose a Marp constructor.");
  }
  return Marp as MarpCoreConstructor;
}

/**
 * Loads Marp Core through an import that host bundlers cannot statically
 * analyze. Without this, Vite/Rolldown rewrites the dynamic import and bundles
 * the CommonJS package into the site build, where its `exports` reference
 * fails at runtime.
 */
function importMarpCore(): Promise<MarpCoreModule> {
  const importModule = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<MarpCoreModule>;
  return importModule("@marp-team/marp-core");
}

function countSlides(html: string): number {
  const slides = html.match(/data-marpit-svg/g);
  if (slides) return slides.length;
  return html.match(/<section\b/g)?.length ?? 0;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
