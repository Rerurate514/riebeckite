/**
 * Discord-specific link preview options.
 *
 * The `seo` plugin already emits the shared OpenGraph and Twitter metadata.
 * This plugin adds only the pieces Discord reads on top of that: the embed
 * accent color and the OpenGraph image metadata.
 */
export type DiscordEmbedOptions = {
  /**
   * Embed accent color, emitted as `<meta name="theme-color">`. Discord uses
   * it for the left border of the preview card.
   *
   * @default "#5865F2"
   */
  themeColor?: string;
  /**
   * Emit `og:image:alt` with the entry title when the entry has an image.
   *
   * @default true
   */
  imageAlt?: boolean;
  /**
   * Emit `og:image:width` and `og:image:height` from frontmatter when the
   * entry has an image and the dimensions are known.
   *
   * @default true
   */
  imageDimensions?: boolean;
};

export type ResolvedDiscordEmbedOptions = {
  themeColor: string;
  imageAlt: boolean;
  imageDimensions: boolean;
};
