import path from "node:path";
import type { PluginRenderContext } from "@riebeckite/core";
import { definePlugin, getExtension } from "@riebeckite/core";

export type MediaPreload = "none" | "metadata" | "auto";

export type MediaOptions = {
  preload?: MediaPreload;
  lazy?: boolean;
  showCaption?: boolean;
  showDownload?: boolean;
  showOpenOriginal?: boolean;
};

type MediaKind = "audio" | "video";

type MediaFormat = {
  kind: MediaKind;
  mimeType: string;
};

const PLUGIN_NAME = "media";
const AUDIO_EXTENSIONS = new Map<string, string>([
  ["mp3", "audio/mpeg"],
  ["m4a", "audio/mp4"],
  ["aac", "audio/aac"],
  ["ogg", "audio/ogg"],
  ["oga", "audio/ogg"],
  ["opus", "audio/ogg"],
  ["wav", "audio/wav"],
  ["flac", "audio/flac"],
]);
const VIDEO_EXTENSIONS = new Map<string, string>([
  ["mp4", "video/mp4"],
  ["m4v", "video/mp4"],
  ["webm", "video/webm"],
  ["ogv", "video/ogg"],
  ["mov", "video/quicktime"],
]);

export function media(options: MediaOptions = {}) {
  return definePlugin({
    name: PLUGIN_NAME,
    order: -10,
    options,
    renderers: [
      {
        name: "media-embed",
        render: (context) => renderMedia(context, options),
      },
    ],
    assets: [
      {
        pluginName: PLUGIN_NAME,
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-media/style.css",
      },
    ],
  });
}

export const mediaPlugin = media;

function renderMedia(
  context: PluginRenderContext,
  options: MediaOptions,
): string | null {
  if (context.kind !== "attachment") return null;

  const format = getMediaFormat(context.path);
  if (!format) return null;

  if (!context.embed) return null;

  const sourceUrl = buildMediaSourceUrl(context);
  const fileName = path.posix.basename(stripUrlHash(context.path));
  const caption =
    options.showCaption === false ? "" : renderCaption(context, fileName);
  const actions = renderActions(context, options);
  const mediaElement =
    format.kind === "audio"
      ? renderAudio(sourceUrl, format.mimeType, options)
      : renderVideo(
          sourceUrl,
          format.mimeType,
          options,
          context.label || fileName,
        );

  return `<figure class="media-embed media-embed--${format.kind}" data-media-path="${escapeHtmlAttribute(context.path)}">
  ${mediaElement}
  ${caption}
  ${actions}
</figure>`;
}

function getMediaFormat(filePath: string): MediaFormat | null {
  const extension = getExtension(stripUrlHash(filePath)).toLowerCase();
  const audioMimeType = AUDIO_EXTENSIONS.get(extension);
  if (audioMimeType) return { kind: "audio", mimeType: audioMimeType };

  const videoMimeType = VIDEO_EXTENSIONS.get(extension);
  if (videoMimeType) return { kind: "video", mimeType: videoMimeType };

  return null;
}

function renderAudio(
  sourceUrl: string,
  mimeType: string,
  options: MediaOptions,
): string {
  return `<audio class="media-embed__player" controls preload="${escapeHtmlAttribute(getPreload(options))}">
    <source src="${escapeHtmlAttribute(sourceUrl)}" type="${escapeHtmlAttribute(mimeType)}" />
  </audio>`;
}

function renderVideo(
  sourceUrl: string,
  mimeType: string,
  options: MediaOptions,
  title: string,
): string {
  return `<video class="media-embed__player" controls preload="${escapeHtmlAttribute(getPreload(options))}" aria-label="${escapeHtmlAttribute(title)}">
    <source src="${escapeHtmlAttribute(sourceUrl)}" type="${escapeHtmlAttribute(mimeType)}" />
  </video>`;
}

function getPreload(options: MediaOptions): MediaPreload {
  if (options.preload) return options.preload;
  return options.lazy === false ? "metadata" : "none";
}

function renderCaption(context: PluginRenderContext, fileName: string): string {
  const label = context.label.trim();
  const caption = label && label !== context.raw ? label : fileName;
  return `<figcaption class="media-embed__caption">${escapeHtml(caption)}</figcaption>`;
}

function renderActions(
  context: PluginRenderContext,
  options: MediaOptions,
): string {
  const actions: string[] = [];
  const sourceUrl = buildMediaSourceUrl(context);

  if (options.showOpenOriginal !== false) {
    actions.push(
      `<a class="media-embed__action" href="${escapeHtmlAttribute(sourceUrl)}">Open original</a>`,
    );
  }

  if (options.showDownload !== false) {
    actions.push(
      `<a class="media-embed__action" href="${escapeHtmlAttribute(sourceUrl)}" download>Download</a>`,
    );
  }

  if (actions.length === 0) return "";
  return `<div class="media-embed__actions">${actions.join("")}</div>`;
}

function buildMediaSourceUrl(context: PluginRenderContext): string {
  const urlFragment = getUrlFragment(context.url);
  const pathFragment = getUrlFragment(context.path);
  const fragment = normalizeMediaFragment(urlFragment ?? pathFragment);
  if (!fragment) return context.url;
  return `${stripUrlHash(context.url)}#${fragment}`;
}

function normalizeMediaFragment(fragment: string | null): string | null {
  if (!fragment) return null;
  const value = decodeURIComponent(fragment).trim();
  if (value.startsWith("t=")) return value;
  if (
    /^(\d+(?:\.\d+)?|\d{1,2}:\d{2}(?::\d{2})?)(?:,(\d+(?:\.\d+)?|\d{1,2}:\d{2}(?::\d{2})?))?$/.test(
      value,
    )
  ) {
    return `t=${value}`;
  }
  return fragment;
}

function getUrlFragment(value: string): string | null {
  const fragmentStart = value.indexOf("#");
  if (fragmentStart < 0) return null;
  return value.slice(fragmentStart + 1) || null;
}

function stripUrlHash(value: string): string {
  const fragmentStart = value.indexOf("#");
  return fragmentStart < 0 ? value : value.slice(0, fragmentStart);
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
