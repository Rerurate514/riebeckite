import {
  definePlugin,
  escapeHtml,
  escapeHtmlAttribute,
  getExtension,
  type PluginRenderContext,
  readContentSourceEntry,
} from "@riebeckite/core";

export type AttachmentOptions = {
  showSize?: boolean;
};

const PLUGIN_NAME = "attachment";

export function attachment(options: AttachmentOptions = {}) {
  return definePlugin({
    name: PLUGIN_NAME,
    processedContentCache: {
      version: "attachment-v2",
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

export const attachmentPlugin = attachment;

async function renderAttachment(
  context: PluginRenderContext,
  options: AttachmentOptions,
): Promise<string | null> {
  if (context.kind !== "attachment") return null;

  const fileName = getFileName(context.path);
  const extension = getExtension(context.path).toUpperCase() || "FILE";
  const size =
    options.showSize === false ? null : await getAttachmentSize(context);

  if (!context.embed) {
    return `<a class="wikilink wikilink-attachment" href="${escapeHtmlAttribute(context.url)}" download>${escapeHtml(context.label || fileName)}</a>`;
  }

  const sizeHtml = size
    ? `<span class="rr-attachment__size">${escapeHtml(size)}</span>`
    : "";

  return `<aside class="rr-attachment" data-attachment-path="${escapeHtmlAttribute(context.path)}">
  <div class="rr-attachment__meta">
    <span class="rr-attachment__format">${escapeHtml(extension)}</span>
    ${sizeHtml}
  </div>
  <div class="rr-attachment__name">${escapeHtml(fileName)}</div>
  <a class="rr-attachment__download" href="${escapeHtmlAttribute(context.url)}" download>${escapeHtml(context.label || "Download")}</a>
</aside>`;
}

async function getAttachmentSize(
  context: PluginRenderContext,
): Promise<string | null> {
  if (!context.contentSource) return null;
  const content = await readContentSourceEntry(
    context.contentSource,
    context.path,
  );
  if (content === null) return null;
  const bytes =
    typeof content === "string"
      ? new TextEncoder().encode(content).byteLength
      : content.byteLength;
  return formatBytes(bytes);
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
