import type { RichEmbedProvider } from "./types.js";

export const RICH_EMBED_PROVIDERS: readonly RichEmbedProvider[] = [
  "youtube",
  "vimeo",
  "spotify",
  "codepen",
  "gist",
  "generic",
];

export const DEFAULT_ASPECT = "16/9";

export const PROVIDER_TITLES: Record<RichEmbedProvider, string> = {
  youtube: "YouTube video",
  vimeo: "Vimeo video",
  spotify: "Spotify embed",
  codepen: "CodePen embed",
  gist: "GitHub Gist",
  generic: "Embedded content",
};

export const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
