import autoCardLinkStyle from "@riebeckite/plugin-autocardlink/style.css?inline";
import codeEnhanceStyle from "@riebeckite/plugin-code-enhance/style.css?inline";
import codeTabsStyle from "@riebeckite/plugin-code-tabs/style.css?inline";
import highlightStyle from "@riebeckite/plugin-highlight/style.css?inline";
import lightboxStyle from "@riebeckite/plugin-lightbox/style.css?inline";
import obsidianMarkdownStyle from "@riebeckite/plugin-obsidian-markdown/style.css?inline";
import shortcodesStyle from "@riebeckite/plugin-shortcodes/style.css?inline";
import sidenotesStyle from "@riebeckite/plugin-sidenotes/style.css?inline";
import defaultThemeStyle from "@riebeckite/theme-default/style.css?inline";
import gruvboxThemeStyle from "@riebeckite/theme-gruvbox/style.css?inline";
import minimalThemeStyle from "@riebeckite/theme-minimal/style.css?inline";
import rerurateThemeStyle from "@riebeckite/theme-rerurate/style.css?inline";
import sakuraThemeStyle from "@riebeckite/theme-sakura/style.css?inline";
import tokyonightThemeStyle from "@riebeckite/theme-tokyonight/style.css?inline";

const styles = {
  default: defaultThemeStyle,
  gruvbox: gruvboxThemeStyle,
  minimal: minimalThemeStyle,
  rerurate: rerurateThemeStyle,
  sakura: sakuraThemeStyle,
  tokyonight: tokyonightThemeStyle,
};

const staticCodeTabsStyle = `
.rr-code-tabs__tab {
  cursor: default;
  pointer-events: none;
}

.rr-code-tabs__panel[hidden] {
  display: block;
}
`;

type PreviewResponse = {
  readonly html: string;
  readonly diagnostics: readonly {
    readonly severity: string;
    readonly message: string;
  }[];
};

const controllers = new WeakMap<HTMLElement, () => void>();
const roots = new Set<HTMLElement>();
let observer: MutationObserver | undefined;

export function initPluginPreviews(): void {
  document
    .querySelectorAll<HTMLElement>("[data-plugin-preview]")
    .forEach(initialize);
  if (observer) return;
  observer = new MutationObserver(() => {
    document
      .querySelectorAll<HTMLElement>("[data-plugin-preview]")
      .forEach(initialize);
    for (const root of roots) {
      if (!root.isConnected) controllers.get(root)?.();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function initialize(root: HTMLElement): void {
  if (controllers.has(root)) return;
  roots.add(root);
  const controller = new AbortController();
  const { signal } = controller;
  const markdown = requireElement(
    root,
    "[data-preview-markdown]",
  ) as unknown as HTMLTextAreaElement;
  const fixture = requireElement(
    root,
    "[data-preview-fixture-select]",
  ) as unknown as HTMLSelectElement;
  const frame = requireElement(
    root,
    "[data-preview-frame]",
  ) as unknown as HTMLIFrameElement;
  const theme = requireElement(
    root,
    "[data-preview-theme]",
  ) as unknown as HTMLSelectElement;
  const mode = requireElement(
    root,
    "[data-preview-mode]",
  ) as unknown as HTMLSelectElement;
  const status = requireElement(root, "[data-preview-status]");
  const diagnostics = requireElement(
    root,
    "[data-preview-diagnostics]",
  ) as unknown as HTMLUListElement;
  let request: AbortController | undefined;
  let revision = 0;

  const render = async () => {
    request?.abort();
    request = new AbortController();
    const currentRevision = ++revision;
    status.textContent = "Rendering";
    const result = await requestPreview(
      {
        markdown: markdown.value,
        pluginId: root.dataset.previewPlugin,
        fixtureId: fixture.value,
        options: readOptions(root),
      },
      request.signal,
    );
    if (signal.aborted || currentRevision !== revision) return;
    if (!result) return;
    frame.srcdoc = createPreviewDocument(result.html, theme.value, mode.value);
    diagnostics.replaceChildren(
      ...result.diagnostics.map((diagnostic) => {
        const item = document.createElement("li");
        item.dataset.severity = diagnostic.severity;
        item.textContent = diagnostic.message;
        return item;
      }),
    );
    status.textContent = result.diagnostics.some(
      (item) => item.severity === "error",
    )
      ? "Check diagnostics"
      : "Rendered";
  };

  root.addEventListener("input", render, { signal });
  root.addEventListener(
    "change",
    (event) => {
      if (event.target === fixture) {
        const value = readFixtureMarkdown(root, fixture.value);
        if (value !== undefined) markdown.value = value;
      }
      void render();
    },
    { signal },
  );
  controllers.set(root, () => {
    revision += 1;
    request?.abort();
    controller.abort();
    controllers.delete(root);
    roots.delete(root);
  });
  void render();
}

function readFixtureMarkdown(
  root: HTMLElement,
  fixtureId: string,
): string | undefined {
  const fixtures = root.dataset.previewFixtures;
  if (!fixtures) return undefined;
  try {
    const parsed: unknown = JSON.parse(fixtures);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    const value = (parsed as Record<string, unknown>)[fixtureId];
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

function readOptions(root: HTMLElement): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  root.querySelectorAll("[data-preview-option]").forEach((element) => {
    const input = element as unknown as HTMLInputElement | HTMLSelectElement;
    const name = input.dataset.previewOption;
    if (!name) return;
    if (input instanceof HTMLInputElement && input.type === "checkbox") {
      options[name] = input.checked;
    } else if (input.type === "number") {
      if (input.value !== "") options[name] = Number(input.value);
    } else {
      options[name] = input.value;
    }
  });
  return options;
}

async function requestPreview(
  input: Record<string, unknown>,
  signal: AbortSignal,
): Promise<PreviewResponse | undefined> {
  try {
    const response = await fetch("/api/playground", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) throw new Error("Preview request failed.");
    return (await response.json()) as PreviewResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      return undefined;
    return {
      html: "",
      diagnostics: [
        {
          severity: "error",
          message: "The preview could not be rendered. Try again.",
        },
      ],
    };
  }
}

function createPreviewDocument(
  html: string,
  theme: string,
  mode: string,
): string {
  const themeStyle = styles[theme as keyof typeof styles] ?? styles.default;
  const themeName = theme === "default" ? "riebeckite" : theme;
  const colorMode = mode === "dark" ? "dark" : "light";
  return `<!doctype html><html data-theme-name="${themeName}" data-theme="${colorMode}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src data:; base-uri 'none'; form-action 'none'"><style>${themeStyle}\n${autoCardLinkStyle}\n${codeEnhanceStyle}\n${codeTabsStyle}\n${staticCodeTabsStyle}\n${highlightStyle}\n${lightboxStyle}\n${obsidianMarkdownStyle}\n${sidenotesStyle}\n${shortcodesStyle}</style></head><body><div class="rb-theme-root" data-theme-name="${themeName}" data-theme="${colorMode}"><article class="rb-article"><div class="rb-article-body"><div class="rb-article-content">${html}</div></div></article></div></body></html>`;
}

function requireElement(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing preview element: ${selector}`);
  return element as unknown as HTMLElement;
}
