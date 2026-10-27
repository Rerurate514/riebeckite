export type PreviewDocumentOptions = {
  readonly html: string;
  readonly styles: readonly string[];
  readonly themeName: string;
  readonly colorMode: "light" | "dark" | "system";
  readonly themeAttributes?: Readonly<Record<string, string>>;
};

export function createPreviewDocument(options: PreviewDocumentOptions): string {
  const themeName = escapeAttribute(options.themeName);
  const colorMode = escapeAttribute(options.colorMode);
  const themeAttributes = serializeThemeAttributes(options.themeAttributes);
  const modeAttribute =
    colorMode === "system" ? "" : ` data-rb-mode="${colorMode}"`;
  return `<!doctype html><html data-rb-theme="${themeName}"${modeAttribute}${themeAttributes}><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src data:; base-uri 'none'; form-action 'none'"><style>${options.styles.join("\n")}</style></head><body><div class="rb-theme-root" data-rb-theme="${themeName}"${modeAttribute}${themeAttributes}><article class="rb-article"><div class="rb-article-body"><div class="rb-article-content">${options.html}</div></div></article></div></body></html>`;
}

function serializeThemeAttributes(
  attributes: Readonly<Record<string, string>> | undefined,
): string {
  if (!attributes) return "";
  return Object.entries(attributes)
    .filter(([name]) => /^data-[a-z0-9-]+$/.test(name))
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join("");
}

function escapeAttribute(value: string): string {
  return value.replace(/[&<>"]/g, (character) => {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    if (character === ">") return "&gt;";
    return "&quot;";
  });
}
