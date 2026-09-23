import fs from "node:fs/promises";
import path from "node:path";
import type { PluginRenderContext } from "@riebeckite/core";
import { definePlugin, getExtension } from "@riebeckite/core";

export type AttachmentOptions = {
  showSize?: boolean;
};

const PLUGIN_NAME = "attachment";

export function attachment(options: AttachmentOptions = {}) {
  return definePlugin({
    name: PLUGIN_NAME,
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

  const fileName = path.posix.basename(context.path);
  const extension = getExtension(context.path).toUpperCase() || "FILE";
  const size =
    options.showSize === false ? null : await getAttachmentSize(context);

  if (!context.embed) {
    return `<a class="wikilink wikilink-attachment" href="${escapeHtmlAttribute(context.url)}" download>${escapeHtml(context.label || fileName)}</a>`;
  }

  const sizeHtml = size
    ? `<span class="attachment-card__size">${escapeHtml(size)}</span>`
    : "";

  return `<aside class="attachment-card" data-attachment-path="${escapeHtmlAttribute(context.path)}">
  <div class="attachment-card__meta">
    <span class="attachment-card__format">${escapeHtml(extension)}</span>
    ${sizeHtml}
  </div>
  <div class="attachment-card__name">${escapeHtml(fileName)}</div>
  <a class="attachment-card__download" href="${escapeHtmlAttribute(context.url)}" download>${escapeHtml(context.label || "ダウンロード")}</a>
</aside>`;
}

async function getAttachmentSize(
  context: PluginRenderContext,
): Promise<string | null> {
  const contentDirectory = context.config?.content.directory;
  if (!contentDirectory) return null;

  const sourcePath = path.resolve(contentDirectory, context.path);
  const relative = path.relative(contentDirectory, sourcePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;

  try {
    const stats = await fs.stat(sourcePath);
    return formatBytes(stats.size);
  } catch {
    return null;
  }
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}
