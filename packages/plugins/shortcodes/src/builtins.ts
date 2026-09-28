import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { ShortcodeAttributes, ShortcodeRenderInput } from "./types.js";

const YOUTUBE_ID_PATTERN =
  /(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{6,})/;
const VIMEO_ID_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)/;
const GIST_URL_PATTERN = /gist\.github\.com\/([^/]+)\/([0-9a-f]+)/i;
const KEY_TOKEN_PATTERN = /[^a-z0-9-]+/g;

function first(
  attributes: ShortcodeAttributes,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const value = attributes[key];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

function token(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .replace(KEY_TOKEN_PATTERN, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function renderFigure(input: ShortcodeRenderInput): string {
  const source = first(input.attributes, ["src", "url", "image", "path"]);
  const caption = first(input.attributes, ["caption"]) || input.label;
  const alt = first(input.attributes, ["alt"]) || caption;
  const body = input.childrenHtml ?? "";

  if (!source) {
    return `<span class="rb-shortcode__figure-fallback">${escapeHtml(
      caption || "figure",
    )}</span>`;
  }

  const width = first(input.attributes, ["width"]);
  const height = first(input.attributes, ["height"]);
  const dimension =
    (width ? ` width="${escapeHtmlAttribute(width)}"` : "") +
    (height ? ` height="${escapeHtmlAttribute(height)}"` : "");
  const captionHtml = caption
    ? `<figcaption class="rb-shortcode__caption">${escapeHtml(
        caption,
      )}</figcaption>`
    : "";

  return `<figure class="rb-shortcode__figure">
  <img class="rb-shortcode__image" src="${escapeHtmlAttribute(
    source,
  )}" alt="${escapeHtmlAttribute(alt)}"${dimension} loading="lazy" decoding="async">
  ${body}
  ${captionHtml}
</figure>`;
}

function renderYouTube(input: ShortcodeRenderInput): string {
  const id =
    first(input.attributes, ["id", "video"]) ||
    (first(input.attributes, ["url", "src"]).match(YOUTUBE_ID_PATTERN)?.[1] ??
      "");

  if (!id) {
    return `<span class="rb-shortcode__video-fallback">${escapeHtml(
      input.label || "youtube",
    )}</span>`;
  }

  const title =
    first(input.attributes, ["title"]) || input.label || "YouTube video";
  return `<div class="rb-shortcode__video">
  <iframe class="rb-shortcode__iframe" src="https://www.youtube-nocookie.com/embed/${escapeHtmlAttribute(
    id,
  )}" title="${escapeHtmlAttribute(
    title,
  )}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>`;
}

function renderVimeo(input: ShortcodeRenderInput): string {
  const id =
    first(input.attributes, ["id", "video"]) ||
    (first(input.attributes, ["url", "src"]).match(VIMEO_ID_PATTERN)?.[1] ??
      "");

  if (!id) {
    return `<span class="rb-shortcode__video-fallback">${escapeHtml(
      input.label || "vimeo",
    )}</span>`;
  }

  const title =
    first(input.attributes, ["title"]) || input.label || "Vimeo video";
  return `<div class="rb-shortcode__video">
  <iframe class="rb-shortcode__iframe" src="https://player.vimeo.com/video/${escapeHtmlAttribute(
    id,
  )}?dnt=1" title="${escapeHtmlAttribute(
    title,
  )}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>
</div>`;
}

function renderGist(input: ShortcodeRenderInput): string {
  let user = first(input.attributes, ["user", "username"]);
  let id = first(input.attributes, ["id", "gist"]);

  if (!user || !id) {
    const match = first(input.attributes, ["url", "src"]).match(
      GIST_URL_PATTERN,
    );
    if (match) {
      user = match[1];
      id = match[2];
    }
  }

  if (!user || !id) {
    return `<span class="rb-shortcode__gist-fallback">${escapeHtml(
      input.label || "gist",
    )}</span>`;
  }

  const label = input.label || "Gist";
  const gistUrl = `https://gist.github.com/${escapeHtmlAttribute(
    user,
  )}/${escapeHtmlAttribute(id)}`;
  const file = first(input.attributes, ["file"]);
  const scriptUrl = `${gistUrl}.js${file ? `?file=${escapeHtmlAttribute(file)}` : ""}`;

  return `<div class="rb-shortcode__gist">
  <script src="${scriptUrl}"></script>
  <noscript><a class="rb-shortcode__gist-link" href="${gistUrl}">${escapeHtml(
    label,
  )}</a></noscript>
</div>`;
}

function renderKbd(input: ShortcodeRenderInput): string {
  const keys =
    input.label || first(input.attributes, ["keys", "key", "text"]) || "";
  const parts = keys.split("+").map((part) => part.trim());

  return parts
    .filter((part) => part.length > 0)
    .map(
      (part) => `<kbd class="rb-shortcode__kbd">${escapeHtml(part)}</kbd>`,
    )
    .join('<span class="rb-shortcode__kbd-separator">+</span>');
}

function renderBadge(input: ShortcodeRenderInput): string {
  const label =
    input.label || first(input.attributes, ["text", "label"]) || "badge";
  const variant = token(
    first(input.attributes, ["variant", "type", "color"]),
    "default",
  );
  const title = first(input.attributes, ["title"]);
  const titleAttribute = title
    ? ` title="${escapeHtmlAttribute(title)}"`
    : "";

  return `<span class="rb-shortcode__badge rb-shortcode__badge--${escapeHtmlAttribute(
    variant,
  )}"${titleAttribute}>${escapeHtml(label)}</span>`;
}

function renderDetails(defaultSummary: string) {
  return (input: ShortcodeRenderInput): string => {
    const summary =
      input.label || first(input.attributes, ["summary"]) || defaultSummary;
    const open =
      first(input.attributes, ["open"]) !== "" &&
      first(input.attributes, ["open"]) !== "false"
        ? " open"
        : "";

    return `<details class="rb-shortcode__details"${open}>
  <summary class="rb-shortcode__summary">${escapeHtml(summary)}</summary>
  <div class="rb-shortcode__details-body">${input.childrenHtml ?? ""}</div>
</details>`;
  };
}

function renderNote(defaultType: string) {
  return (input: ShortcodeRenderInput): string => {
    const type = token(
      first(input.attributes, ["type", "variant"]) || defaultType,
      defaultType,
    );
    const title =
      first(input.attributes, ["title"]) ||
      (input.container ? input.label : "");
    const heading = title
      ? `<p class="rb-shortcode__note-title">${escapeHtml(title)}</p>`
      : "";
    const body =
      input.childrenHtml ??
      (input.label && !input.container
        ? `<p class="rb-shortcode__note-text">${escapeHtml(input.label)}</p>`
        : "");

    return `<div class="rb-shortcode__note rb-shortcode__note--${escapeHtmlAttribute(
      type,
    )}">
  ${heading}
  <div class="rb-shortcode__note-body">${body}</div>
</div>`;
  };
}

function renderLinkCard(input: ShortcodeRenderInput): string {
  const url = first(input.attributes, ["url", "href"]);
  if (!url) {
    return `<span class="rb-shortcode__link-card-fallback">${escapeHtml(
      input.label || "link-card",
    )}</span>`;
  }

  const title = first(input.attributes, ["title"]) || input.label || url;
  const description = first(input.attributes, ["description"]);
  const image = first(input.attributes, ["image", "icon"]);
  const imageHtml = image
    ? `<img class="rb-shortcode__link-card-image" src="${escapeHtmlAttribute(
        image,
      )}" alt="" loading="lazy" decoding="async">`
    : "";
  const descriptionHtml = description
    ? `<span class="rb-shortcode__link-card-description">${escapeHtml(
        description,
      )}</span>`
    : "";

  return `<a class="rb-shortcode__link-card" href="${escapeHtmlAttribute(
    url,
  )}" target="_blank" rel="noopener noreferrer">
  ${imageHtml}
  <span class="rb-shortcode__link-card-body">
    <span class="rb-shortcode__link-card-title">${escapeHtml(title)}</span>
    ${descriptionHtml}
    <span class="rb-shortcode__link-card-url">${escapeHtml(url)}</span>
  </span>
</a>`;
}

function renderFile(input: ShortcodeRenderInput): string {
  const url = first(input.attributes, ["url", "src", "path", "href"]);
  const label =
    first(input.attributes, ["name", "label"]) || input.label || url;

  if (!url) {
    return `<span class="rb-shortcode__file-fallback">${escapeHtml(
      label || "file",
    )}</span>`;
  }

  const size = first(input.attributes, ["size", "bytes"]);
  const sizeHtml = size
    ? `<span class="rb-shortcode__file-size">${escapeHtml(size)}</span>`
    : "";

  return `<a class="rb-shortcode__file" href="${escapeHtmlAttribute(
    url,
  )}" download>
  <span class="rb-shortcode__file-name">${escapeHtml(label)}</span>
  ${sizeHtml}
</a>`;
}

/** Built-in renderers keyed by directive name. */
export const builtinShortcodes: Record<
  string,
  (input: ShortcodeRenderInput) => string
> = {
  figure: renderFigure,
  youtube: renderYouTube,
  vimeo: renderVimeo,
  gist: renderGist,
  kbd: renderKbd,
  badge: renderBadge,
  details: renderDetails("Details"),
  spoiler: renderDetails("Spoiler"),
  note: renderNote("note"),
  callout: renderNote("callout"),
  "link-card": renderLinkCard,
  file: renderFile,
};

export const builtinShortcodeNames: readonly string[] = Object.keys(
  builtinShortcodes,
);
