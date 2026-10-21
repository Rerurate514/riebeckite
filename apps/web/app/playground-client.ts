import codeTabsStyle from "@riebeckite/plugin-code-tabs/style.css?inline";
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

type PreviewResponse = {
  readonly html: string;
  readonly diagnostics: readonly {
    readonly severity: string;
    readonly message: string;
  }[];
};

export function initPlayground(): void {
  const root = document.querySelector<HTMLElement>("[data-playground]");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  const markdown = requiredElement<HTMLTextAreaElement>(
    root,
    "[data-playground-markdown]",
  );
  const plugin = requiredElement<HTMLSelectElement>(
    root,
    "[data-playground-plugin]",
  );
  const syncTabs = requiredElement<HTMLInputElement>(
    root,
    "[data-playground-sync-tabs]",
  );
  const theme = requiredElement<HTMLSelectElement>(
    root,
    "[data-playground-theme]",
  );
  const mode = requiredElement<HTMLSelectElement>(root, "[data-playground-mode]");
  const frame = requiredElement<HTMLIFrameElement>(root, "[data-playground-frame]");
  const status = requiredElement<HTMLElement>(root, "[data-playground-status]");
  const diagnostics = requiredElement<HTMLUListElement>(
    root,
    "[data-playground-diagnostics]",
  );
  let revision = 0;

  const render = async () => {
    const currentRevision = ++revision;
    status.textContent = "Rendering";
    const result = await requestPreview(
      markdown.value,
      plugin.value || undefined,
      plugin.value === "code-tabs" ? { syncTabs: syncTabs.checked } : undefined,
    );
    if (currentRevision !== revision) return;
    frame.srcdoc = createPreviewDocument(
      result.html,
      styles[theme.value as keyof typeof styles] ?? styles.default,
      theme.value === "default" ? "riebeckite" : theme.value,
      mode.value === "dark" ? "dark" : "light",
    );
    diagnostics.replaceChildren(
      ...result.diagnostics.map((diagnostic) => {
        const item = document.createElement("li");
        item.dataset.severity = diagnostic.severity;
        item.textContent = diagnostic.message;
        return item;
      }),
    );
    status.textContent = result.diagnostics.some(
      (diagnostic) => diagnostic.severity === "error",
    )
      ? "Check diagnostics"
      : "Rendered";
  };

  markdown.addEventListener("input", () => void render());
  plugin.addEventListener("change", () => void render());
  syncTabs.addEventListener("change", () => void render());
  theme.addEventListener("change", () => void render());
  mode.addEventListener("change", () => void render());
  void render();
}

async function requestPreview(
  markdown: string,
  pluginId: string | undefined,
  options: { readonly syncTabs: boolean } | undefined,
): Promise<PreviewResponse> {
  try {
    const response = await fetch("/api/playground", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown, pluginId, options }),
    });
    if (!response.ok) throw new Error("Preview request failed.");
    return (await response.json()) as PreviewResponse;
  } catch {
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

function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing playground element: ${selector}`);
  return element;
}

function createPreviewDocument(
  html: string,
  themeStyle: string,
  themeName: string,
  colorMode: "light" | "dark",
): string {
  return `<!doctype html>
<html data-theme-name="${themeName}" data-theme="${colorMode}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src data:; base-uri 'none'; form-action 'none'">
<style>${themeStyle}\n${codeTabsStyle}</style>
</head>
<body>
<div class="rb-theme-root" data-theme-name="${themeName}" data-theme="${colorMode}">
<article class="rb-article"><div class="rb-article-body"><div class="rb-article-content">${html}</div></div></article>
</div>
</body>
</html>`;
}
