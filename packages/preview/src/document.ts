export type PreviewDocumentOptions = {
  readonly html: string;
  readonly styles: readonly string[];
  readonly themeName: string;
  readonly colorMode: "light" | "dark" | "system";
};

export function createPreviewDocument(options: PreviewDocumentOptions): string {
  const themeName = escapeAttribute(options.themeName);
  const colorMode = escapeAttribute(options.colorMode);
  return `<!doctype html><html data-theme-name="${themeName}" data-theme="${colorMode}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; font-src data:; base-uri 'none'; form-action 'none'"><style>${options.styles.join("\n")}</style></head><body><div class="rb-theme-root" data-theme-name="${themeName}" data-theme="${colorMode}"><article class="rb-article"><div class="rb-article-body"><div class="rb-article-content">${options.html}</div></div></article></div></body></html>`;
}

function escapeAttribute(value: string): string {
  return value.replace(/[&<>"]/g, (character) => {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    if (character === ">") return "&gt;";
    return "&quot;";
  });
}
