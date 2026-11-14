export type { SeoMetadata } from "@riebeckite/core";
export {
  buildTaxonomyIndex,
  serializeTaxonomyIndex,
  serializeTaxonomyTerm,
  toEntryReference,
} from "./src/collections.js";
export { buildFeedHeadTags, renderTermFeed } from "./src/feeds.js";
export {
  DEFAULT_TAXONOMY_CLASS_NAME,
  DEFAULT_TAXONOMY_DATA_ENDPOINT,
  DEFAULT_TAXONOMY_FEED_LIMIT,
  DEFAULT_TAXONOMY_FOLDERS_BASE_PATH,
  DEFAULT_TAXONOMY_MIN_ENTRIES,
  DEFAULT_TAXONOMY_RELATED_LIMIT,
  DEFAULT_TAXONOMY_TAGS_BASE_PATH,
  resolveTaxonomyOptions,
} from "./src/options.js";
export {
  renderRelatedTerms,
  renderTaxonomyIndexPage,
  renderTaxonomyPage,
} from "./src/pages.js";
export { buildTaxonomySeo } from "./src/seo.js";
export { buildTaxonomyTagHref, slugifyTaxonomyValue } from "./src/slug.js";
export type {
  ResolvedTaxonomyOptions,
  TaxonomyEntryReference,
  TaxonomyFeedFormat,
  TaxonomyFeedLinks,
  TaxonomyFeedOptions,
  TaxonomyHeadTag,
  TaxonomyIndex,
  TaxonomyIndexData,
  TaxonomyKind,
  TaxonomyOptions,
  TaxonomyPage,
  TaxonomyRelatedTerm,
  TaxonomyTerm,
  TaxonomyTermContext,
  TaxonomyTermData,
} from "./src/types.js";
export { buildTaxonomyAbsoluteUrl } from "./src/url.js";
export { TAXONOMY_PLUGIN_NAME } from "./taxonomy_constants.js";
export { selectTaxonomyModel } from "./taxonomy_endpoints.js";
export { resolveTaxonomyOptionsFromConfig } from "./taxonomy_options.js";
export { taxonomy } from "./taxonomy_plugin.js";
