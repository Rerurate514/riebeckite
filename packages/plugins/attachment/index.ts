import {
  definePlugin,
  escapeHtml,
  escapeHtmlAttribute,
  getContentSourceEntrySize,
  getExtension,
  type PluginRenderContext,
  readContentSourceEntry,
} from "@riebeckite/core";

export type AttachmentOptions = {
  showSize?: boolean;
  preview?: readonly string[] | false;
};

const PLUGIN_NAME = "attachment";

const DEFAULT_PREVIEW_EXTENSIONS: readonly string[] = [
  "txt",
  "log",
  "csv",
  "tsv",
  "json",
  "yaml",
  "yml",
  "toml",
  "ini",
  "xml",
];

const MAX_PREVIEW_BYTES = 256 * 1024;

export function attachment(options: AttachmentOptions = {}) {
  return definePlugin({
    name: PLUGIN_NAME,
    processedContentCache: {
      version: "attachment-v4",
      dependencyMode: "tracked",
    },
    options,
    renderers: [
      {
        name: "attachment-card",
        render: async (context) => renderAttachment(context, options),
      },
    ],
    assets: [
      {
        pluginName: PLUGIN_NAME,
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-attachment/style.css",
      },
    ],
  });
}

async function renderAttachment(
  context: PluginRenderContext,
  options: AttachmentOptions,
): Promise<string | null> {
  if (context.kind !== "attachment") return null;

  const fileName = getFileName(context.path);
  const extension = getExtension(context.path);
  const format = extension.toUpperCase() || "FILE";

  if (!context.embed) {
    return `<a class="rr-attachment-link" href="${escapeHtmlAttribute(context.url)}" download>${escapeHtml(context.label || fileName)}</a>`;
  }

  const preview = await readTextPreview(context, extension, options);
  const bytes =
    preview?.bytes ??
    (options.showSize === false ? null : await getAttachmentSize(context));
  const sizeHtml =
    options.showSize === false || bytes === null
      ? ""
      : `<span class="rr-attachment__size">${escapeHtml(formatBytes(bytes))}</span>`;

  if (preview) {
    return `<figure class="rr-attachment rr-attachment--text" data-attachment-path="${escapeHtmlAttribute(context.path)}">
  <pre class="rr-attachment__preview" tabindex="0"><code class="language-${escapeHtmlAttribute(extension)}">${escapeHtml(preview.text)}</code></pre>
  <figcaption class="rr-attachment__footer">
    <span class="rr-attachment__name">${escapeHtml(fileName)}</span>
    <span class="rr-attachment__format">${escapeHtml(format)}</span>
    ${sizeHtml}
    <a class="rr-attachment__download" href="${escapeHtmlAttribute(context.url)}" download>${escapeHtml(context.label || "Download")}</a>
  </figcaption>
</figure>`;
  }

  return `<aside class="rr-attachment" data-attachment-path="${escapeHtmlAttribute(context.path)}">
  <div class="rr-attachment__meta">
    <span class="rr-attachment__format">${escapeHtml(format)}</span>
    ${sizeHtml}
  </div>
  <div class="rr-attachment__name">${escapeHtml(fileName)}</div>
  <a class="rr-attachment__download" href="${escapeHtmlAttribute(context.url)}" download>${escapeHtml(context.label || "Download")}</a>
</aside>`;
}

type TextPreview = {
  readonly text: string;
  readonly bytes: number;
};

async function readTextPreview(
  context: PluginRenderContext,
  extension: string,
  options: AttachmentOptions,
): Promise<TextPreview | null> {
  if (!isPreviewTarget(extension, options) || !context.contentSource)
    return null;
  try {
    const size = await getContentSourceEntrySize(
      context.contentSource,
      context.path,
    );
    if (size === null || size > MAX_PREVIEW_BYTES) return null;

    const content = await readContentSourceEntry(
      context.contentSource,
      context.path,
    );
    if (content === null) return null;

    const bytes =
      typeof content === "string" ? new TextEncoder().encode(content) : content;
    if (bytes.byteLength > MAX_PREVIEW_BYTES || bytes.includes(0)) return null;

    const text =
      typeof content === "string"
        ? content
        : new TextDecoder("utf-8", { fatal: true }).decode(content);
    return { text, bytes: bytes.byteLength };
  } catch {
    return null;
  }
}

function isPreviewTarget(
  extension: string,
  options: AttachmentOptions,
): boolean {
  if (options.preview === false) return false;
  return (options.preview ?? DEFAULT_PREVIEW_EXTENSIONS).includes(extension);
}

async function getAttachmentSize(
  context: PluginRenderContext,
): Promise<number | null> {
  if (!context.contentSource) return null;
  return await getContentSourceEntrySize(context.contentSource, context.path);
}

function getFileName(contentPath: string): string {
  return contentPath.split("/").at(-1) ?? contentPath;
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}
