import type {
  RichEmbedBlockOptions,
  RichEmbedOptions,
  RichEmbedProvider,
} from "./types.js";

export const RICH_EMBED_PROVIDERS: readonly RichEmbedProvider[] = [
  "youtube",
  "vimeo",
  "spotify",
  "codepen",
  "gist",
  "generic",
];

export const DEFAULT_ASPECT = "16/9";

const PROVIDER_TITLES: Record<RichEmbedProvider, string> = {
  youtube: "YouTube video",
  vimeo: "Vimeo video",
  spotify: "Spotify embed",
  codepen: "CodePen embed",
  gist: "GitHub Gist",
  generic: "Embedded content",
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);
const SPOTIFY_HOSTS = new Set(["open.spotify.com"]);
const CODEPEN_HOSTS = new Set(["codepen.io", "www.codepen.io"]);
const GIST_HOSTS = new Set(["gist.github.com"]);

const SPOTIFY_TYPES = new Set(["track", "album", "playlist", "episode", "show"]);

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const NUMERIC_ID = /^\d+$/;
const SLUG_ID = /^[A-Za-z0-9]+$/;
const USERNAME = /^[A-Za-z0-9_-]+$/;
const ASPECT_PATTERN = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/;
const OPTION_LINE = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/;

export type ParsedEmbedBlock = {
  url: string;
  options: RichEmbedBlockOptions;
};

export type EmbedResolution =
  | {
      kind: "iframe";
      provider: RichEmbedProvider;
      src: string;
      title: string;
      aspect: string;
    }
  | {
      kind: "link";
      provider: "gist";
      href: string;
      label: string;
      aspect: string;
    }
  | {
      kind: "unsupported";
      provider: RichEmbedProvider | null;
      message: string;
    };

export type SupportedEmbedResolution = Exclude<
  EmbedResolution,
  { kind: "unsupported" }
>;

type Detection =
  | {
      kind: "iframe";
      provider: RichEmbedProvider;
      src: string;
    }
  | {
      kind: "link";
      provider: "gist";
      href: string;
    };

/**
 * Parses an `embed` fenced code block. The first non-empty line is the URL and
 * every following `key: value` line is an option.
 */
export function parseEmbedBlock(source: string): ParsedEmbedBlock | null {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return null;

  const [url, ...optionLines] = lines;
  const options: RichEmbedBlockOptions = {};

  for (const line of optionLines) {
    const match = OPTION_LINE.exec(line);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (value.length === 0) continue;
    if (key === "title") options.title = value;
    else if (key === "caption") options.caption = value;
    else if (key === "aspect") options.aspect = normalizeAspect(value) ?? undefined;
    else if (key === "start") options.start = parseStart(value);
  }

  return { url, options };
}

export function normalizeAspect(value: string): string | null {
  const normalized = value.replace(/\s+/g, "");
  return ASPECT_PATTERN.test(normalized) ? normalized : null;
}

/**
 * Resolves a URL to an embeddable target using only string inspection. No
 * network request is performed.
 */
export function resolveEmbed(
  urlText: string,
  block: RichEmbedBlockOptions,
  config: RichEmbedOptions,
): EmbedResolution {
  let url: URL;
  try {
    url = new URL(urlText);
  } catch {
    return {
      kind: "unsupported",
      provider: null,
      message: "Expected an absolute https URL on the first line.",
    };
  }

  if (url.protocol !== "https:") {
    return {
      kind: "unsupported",
      provider: null,
      message: "Only https: URLs are supported.",
    };
  }

  const host = url.hostname.toLowerCase();
  const aspect = block.aspect ?? DEFAULT_ASPECT;
  const detection = detectProvider(url, host);

  if (detection) {
    if (!isProviderEnabled(detection.provider, config)) {
      return {
        kind: "unsupported",
        provider: detection.provider,
        message: `Provider "${detection.provider}" is disabled by configuration.`,
      };
    }
    if (detection.kind === "link") {
      return {
        kind: "link",
        provider: detection.provider,
        href: detection.href,
        label: block.title ?? PROVIDER_TITLES[detection.provider],
        aspect,
      };
    }
    return {
      kind: "iframe",
      provider: detection.provider,
      src: withStart(detection.provider, detection.src, block.start),
      title: block.title ?? PROVIDER_TITLES[detection.provider],
      aspect,
    };
  }

  if (isProviderEnabled("generic", config) && isAllowedHost(host, config)) {
    return {
      kind: "iframe",
      provider: "generic",
      src: url.href,
      title: block.title ?? PROVIDER_TITLES.generic,
      aspect,
    };
  }

  return {
    kind: "unsupported",
    provider: null,
    message: `No supported provider for "${host}". Add the host to allowHosts to embed it as a generic iframe.`,
  };
}

function detectProvider(url: URL, host: string): Detection | null {
  if (YOUTUBE_HOSTS.has(host)) {
    const id = youtubeId(url);
    if (id) {
      return {
        kind: "iframe",
        provider: "youtube",
        src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`,
      };
    }
  }

  if (VIMEO_HOSTS.has(host)) {
    const id = pathSegments(url)[0];
    if (id && NUMERIC_ID.test(id)) {
      return {
        kind: "iframe",
        provider: "vimeo",
        src: `https://player.vimeo.com/video/${encodeURIComponent(id)}`,
      };
    }
  }

  if (SPOTIFY_HOSTS.has(host)) {
    const [type, id] = pathSegments(url);
    if (
      type &&
      SPOTIFY_TYPES.has(type) &&
      id &&
      SLUG_ID.test(id)
    ) {
      return {
        kind: "iframe",
        provider: "spotify",
        src: `https://open.spotify.com/embed/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,
      };
    }
  }

  if (CODEPEN_HOSTS.has(host)) {
    const [user, marker, id] = pathSegments(url);
    if (
      user &&
      USERNAME.test(user) &&
      marker === "pen" &&
      id &&
      SLUG_ID.test(id)
    ) {
      return {
        kind: "iframe",
        provider: "codepen",
        src: `https://codepen.io/${encodeURIComponent(user)}/embed/${encodeURIComponent(id)}`,
      };
    }
  }

  if (GIST_HOSTS.has(host)) {
    return { kind: "link", provider: "gist", href: url.href };
  }

  return null;
}

function youtubeId(url: URL): string | null {
  const segments = pathSegments(url);
  if (url.hostname.toLowerCase() === "youtu.be") {
    return segments[0] && YOUTUBE_ID.test(segments[0]) ? segments[0] : null;
  }
  if (url.pathname === "/watch" || url.pathname === "/watch/") {
    const id = url.searchParams.get("v");
    return id && YOUTUBE_ID.test(id) ? id : null;
  }
  if (segments[0] === "shorts" || segments[0] === "embed" || segments[0] === "live") {
    return segments[1] && YOUTUBE_ID.test(segments[1]) ? segments[1] : null;
  }
  return null;
}

function pathSegments(url: URL): string[] {
  return url.pathname.split("/").filter((segment) => segment.length > 0);
}

function isAllowedHost(host: string, config: RichEmbedOptions): boolean {
  return (config.allowHosts ?? []).some(
    (allowed) => allowed.trim().toLowerCase() === host,
  );
}

function isProviderEnabled(
  provider: RichEmbedProvider,
  config: RichEmbedOptions,
): boolean {
  if (config.disable?.includes(provider)) return false;
  if (config.providers && !config.providers.includes(provider)) return false;
  return true;
}

function withStart(
  provider: RichEmbedProvider,
  src: string,
  start: number | undefined,
): string {
  if (provider !== "youtube" || start === undefined) return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}start=${start}`;
}

function parseStart(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  const seconds = Number.parseInt(value, 10);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}
