import type { GalleryOptions } from "./types.js";

export const DEFAULT_GALLERY_COLUMNS = 3;
export const DEFAULT_GALLERY_ASPECT = "4/3";

export type ResolvedGalleryOptions = {
  readonly language: string;
  readonly columns: number;
  readonly aspect: string;
};

/** Applies plugin-level defaults for the language and the grid geometry. */
export function resolveGalleryOptions(
  options: GalleryOptions = {},
): ResolvedGalleryOptions {
  return {
    language: options.language ?? "gallery",
    columns: options.columns ?? DEFAULT_GALLERY_COLUMNS,
    aspect: options.aspect ?? DEFAULT_GALLERY_ASPECT,
  };
}
