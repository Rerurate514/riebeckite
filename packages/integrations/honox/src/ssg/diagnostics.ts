import type { SsgModule } from "./types.js";

export function formatSsrNoExternal(): string {
  return "/^honox(?:\\/.*)?$/";
}

export function logSsgDiagnostics(
  logger: { info(message: string): void },
  message: string,
): void {
  if (process.env.RIEBECKITE_SSG_DIAGNOSTICS !== "1") return;
  logger.info(`[riebeckite-ssg] ${message}`);
}

export function logGeneratedHtmlAssetDiagnostics(
  logger: { info(message: string): void },
  pages: readonly { path: string; html: string }[],
): void {
  if (process.env.RIEBECKITE_SSG_DIAGNOSTICS !== "1") return;
  const renderedPages = pages.filter(
    (page) =>
      !/<meta\b[^>]*\bhttp-equiv=["']refresh["'][^>]*\bcontent=["'][^"']*\burl=/iu.test(
        page.html,
      ),
  );
  const cssPages = renderedPages.filter((page) =>
    /<link\b[^>]*\brel=["'][^"']*\bstylesheet\b[^"']*["']/iu.test(page.html),
  );
  const scriptPages = renderedPages.filter((page) =>
    /<script\b[^>]*\bsrc=["'][^"']+["']/iu.test(page.html),
  );
  const missingCss = renderedPages
    .filter((page) => !cssPages.includes(page))
    .map((page) => page.path);
  const missingScript = renderedPages
    .filter((page) => !scriptPages.includes(page))
    .map((page) => page.path);
  logger.info(
    `[riebeckite-ssg] rendered HTML assets: ${pages.length} documents (${renderedPages.length} pages, ${pages.length - renderedPages.length} redirects) · CSS ${cssPages.length} · JavaScript ${scriptPages.length} · missing CSS ${missingCss.length} · missing JavaScript ${missingScript.length}`,
  );
  if (missingCss.length > 0 || missingScript.length > 0) {
    logger.info(
      `[riebeckite-ssg] missing asset references: CSS ${missingCss.join(", ") || "none"} · JavaScript ${missingScript.join(", ") || "none"}`,
    );
  }
}

/**
 * Runs post-SSG HTML inspections contributed by Core plugins. Structural rules
 * that need the whole document (a11y, duplicate ids, anchors) cannot see the
 * final page during the Core lifecycle, so `@riebeckite/honox` forwards every
 * emitted HTML file to plugins that declare `inspectGeneratedHtml`.
 */
export function inspectGeneratedHtmlPages(
  module: SsgModule,
  pages: readonly { path: string; html: string }[],
  log: { warn: (message: string) => void; info: (message: string) => void },
): void {
  const plugins = module.config?.plugins ?? [];
  for (const plugin of plugins) {
    const inspector = plugin.inspectGeneratedHtml;
    if (typeof inspector !== "function") continue;

    for (const page of pages) {
      for (const diagnostic of inspector(page) ?? []) {
        const label = `[${plugin.name ?? "plugin"}] ${page.path}: ${diagnostic.message}`;
        if (diagnostic.severity === "info") log.info(label);
        else log.warn(label);
      }
    }
  }
}
