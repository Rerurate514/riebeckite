import { CONTENT_MARKDOWN_GUIDES } from "./content_pages_guides_content.js";
import { FEATURE_MARKDOWN_GUIDES } from "./content_pages_guides_features.js";

export const PLUGIN_MARKDOWN_GUIDES: Readonly<
  Record<string, { readonly summary: string; readonly markdown: string }>
> = {
  ...CONTENT_MARKDOWN_GUIDES,
  ...FEATURE_MARKDOWN_GUIDES,
};
