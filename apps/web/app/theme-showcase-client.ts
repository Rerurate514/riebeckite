import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { createPreview, definePluginPreview } from "@riebeckite/preview";
import {
  createPreviewSessionTransport,
  mountThemePreview,
} from "@riebeckite/preview/ui";
import {
  getShowcaseFixtures,
  getShowcaseThemes,
  getThemeDocsHref,
  showcaseThemes,
} from "./lib/theme-showcase";

const previewLayoutStyle = `html, body { margin: 0; min-height: 100%; } .rb-theme-root { min-height: 100vh; padding: 1rem; } .rb-article { width: min(100%, var(--rb-layout-article-max, 48rem)); margin-inline: auto; }`;

export function initThemeShowcase(): void {
  document
    .querySelectorAll<HTMLElement>("[data-plugin-preview]")
    .forEach((root) => {
      if (root.dataset.previewMounted === "true") return;
      root.dataset.previewMounted = "true";
      const locale = document.documentElement.lang === "ja" ? "ja" : "en";
      const mode = root.dataset.themePreviewMode ?? "gallery";
      const themeId =
        (
          root.querySelector(
            "[data-preview-theme]",
          ) as globalThis.HTMLSelectElement | null
        )?.value ?? "riebeckite";
      void loadThemeStyles(
        mode === "single"
          ? [themeId]
          : showcaseThemes.map((theme) => theme.name),
      ).then(
        (themeStyles) => mount(root, locale, themeStyles),
        () => {
          delete root.dataset.previewMounted;
          const status = root.querySelector<HTMLOutputElement>(
            "[data-preview-status]",
          );
          if (status)
            status.textContent =
              locale === "ja"
                ? "プレビューを読み込めませんでした"
                : "The preview could not be loaded";
        },
      );
    });
}

function mount(
  root: HTMLElement,
  locale: "en" | "ja",
  themeStyles: Record<string, string>,
): void {
  if (!root.isConnected) return;
  const themes = getShowcaseThemes(locale);
  const fixtures = getShowcaseFixtures(locale);
  const session = createPreview({
    plugins: [
      definePluginPreview({
        id: "theme-showcase",
        title: "Theme showcase",
        availability: "browser",
        fixtures,
        create: () => obsidianMarkdown(),
      }),
    ],
  });
  const showcase = root.closest<HTMLElement>("[data-theme-showcase]");
  const code =
    showcase?.querySelector<HTMLElement>("[data-theme-detail-code]") ??
    undefined;
  const updateDetail = (themeId: string) => {
    const theme = themes.find((item) => item.name === themeId);
    if (!theme || !showcase) return;
    const name = showcase.querySelector<HTMLElement>(
      "[data-theme-detail-name]",
    );
    const description = showcase.querySelector<HTMLElement>(
      "[data-theme-detail-description]",
    );
    const packageName = showcase.querySelector<HTMLElement>(
      "[data-theme-detail-package]",
    );
    const docs = showcase.querySelector<HTMLAnchorElement>(
      "[data-theme-detail-docs]",
    );
    if (name) name.textContent = theme.label;
    if (description) description.textContent = theme.description;
    if (packageName) packageName.textContent = theme.packageName;
    if (docs) docs.href = getThemeDocsHref(theme.name, locale);
    showcase
      .querySelectorAll<HTMLElement>("[data-theme-card]")
      .forEach((card) => {
        card.dataset.selected = String(card.dataset.themeCard === theme.name);
      });
  };
  const disposePreview = mountThemePreview(root, {
    themes: showcaseThemes.map((theme) => ({
      id: theme.name,
      settings: theme.settings,
      presets: theme.presets,
    })),
    defaultTheme:
      (
        root.querySelector(
          "[data-preview-theme]",
        ) as globalThis.HTMLSelectElement | null
      )?.value ?? "riebeckite",
    themeStyles,
    themeAttributes: Object.fromEntries(
      showcaseThemes.map((theme) => [theme.name, theme.attributes]),
    ),
    articleTitle: locale === "ja" ? "テーマのプレビュー" : "Theme preview",
    contentStyles: [previewLayoutStyle],
    pluginStyles: [],
    transport: createPreviewSessionTransport(session),
    selectors: {
      fixture: "[data-preview-fixture]",
      page: "[data-preview-page]",
    },
    configurationTarget: code,
    configuration: (themeId, settings, colorMode) =>
      configuration(themeId, settings, colorMode),
    onThemeChange: updateDetail,
  });
  showcase
    ?.querySelectorAll<HTMLButtonElement>("[data-theme-select]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const select = root.querySelector(
          "[data-preview-theme]",
        ) as globalThis.HTMLSelectElement | null;
        if (!select || !button.dataset.themeSelect) return;
        select.value = button.dataset.themeSelect;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
  const observer = new MutationObserver(() => {
    if (root.isConnected) return;
    observer.disconnect();
    disposePreview();
    void session.dispose();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function configuration(
  themeId: string,
  settings: Readonly<Record<string, string | number | boolean>>,
  colorMode: string,
): string {
  const theme = showcaseThemes.find((item) => item.name === themeId);
  if (!theme) return "";
  const options: Record<string, unknown> = {};
  if (colorMode !== "system") options.colorMode = colorMode;
  if (Object.keys(settings).length > 0) options.settings = settings;
  const call =
    Object.keys(options).length > 0 ? `(${JSON.stringify(options)})` : "()";
  return `import { defineConfig } from "@riebeckite/core";\nimport { ${theme.factory} } from "${theme.packageName}";\n\nexport default defineConfig({\n  theme: ${theme.factory}${call},\n});`;
}

async function loadThemeStyles(
  ids: readonly string[],
): Promise<Record<string, string>> {
  return Object.fromEntries(
    await Promise.all(
      ids.map(async (id) => [id, await loadThemeStyle(id)] as const),
    ),
  );
}

async function loadThemeStyle(id: string): Promise<string> {
  const styles: Record<string, () => Promise<{ default: string }>> = {
    riebeckite: () => import("@riebeckite/theme-default/style.css?inline"),
    editorial: () => import("@riebeckite/theme-editorial/style.css?inline"),
    fieldnotes: () => import("@riebeckite/theme-fieldnotes/style.css?inline"),
    folio: () => import("@riebeckite/theme-folio/style.css?inline"),
    garden: () => import("@riebeckite/theme-garden/style.css?inline"),
    gruvbox: () => import("@riebeckite/theme-gruvbox/style.css?inline"),
    minimal: () => import("@riebeckite/theme-minimal/style.css?inline"),
    module: () => import("@riebeckite/theme-module/style.css?inline"),
    rerurate: () => import("@riebeckite/theme-rerurate/style.css?inline"),
    sakura: () => import("@riebeckite/theme-sakura/style.css?inline"),
    signal: () => import("@riebeckite/theme-signal/style.css?inline"),
    technical: () => import("@riebeckite/theme-technical/style.css?inline"),
    terminal: () => import("@riebeckite/theme-terminal/style.css?inline"),
    tokyonight: () => import("@riebeckite/theme-tokyonight/style.css?inline"),
  };
  const style = (await styles[id]?.())?.default ?? "";
  if (id === "sakura")
    return inlinePreviewFont(
      style,
      "source-serif-4-latin-wght-normal.woff2",
      (
        await import(
          "../../../packages/themes/sakura/styles/fonts/source-serif-4-latin-wght-normal.woff2?inline"
        )
      ).default,
    );
  if (id === "tokyonight")
    return inlinePreviewFont(
      style,
      "jetbrains-mono-latin-wght-normal.woff2",
      (
        await import(
          "../../../packages/themes/tokyonight/styles/fonts/jetbrains-mono-latin-wght-normal.woff2?inline"
        )
      ).default,
    );
  return style;
}

function inlinePreviewFont(
  style: string,
  fileName: string,
  dataUrl: string,
): string {
  const stem = fileName.replace(/\.[^.]+$/, "");
  return style.replace(
    new RegExp(`url\\([^)]*${stem}[^)]*\\)`),
    () => `url("${dataUrl}")`,
  );
}
