import type { PublicContentView } from "@riebeckite/core";
import { propertiesFieldConfig } from "./options.js";
import { convertValue } from "./properties_core.js";
import { findPropertyIcon } from "./properties_helpers.js";
import type { ConversionState } from "./properties_types.js";
import { selectProperties } from "./selection.js";
import type {
  PropertiesData,
  PropertiesLinkResolver,
  PropertiesRenderContext,
  ResolvedPropertiesOptions,
} from "./types.js";

export function buildPropertiesData(
  frontmatter: Readonly<Record<string, unknown>> | null | undefined,
  options: ResolvedPropertiesOptions,
  context: PropertiesRenderContext = {},
): PropertiesData {
  const entries = selectProperties(frontmatter, options);
  const state: ConversionState = { options, context };
  return {
    title: options.title,
    className: options.className,
    collapsed: options.collapsed,
    items: entries.map(([key, value]) => {
      const icon = findPropertyIcon(context.icons, key);
      return {
        key,
        ...(icon ? { icon } : {}),
        value: convertValue(
          value,
          key,
          propertiesFieldConfig(options.fields, key),
          state,
          0,
        ),
      };
    }),
  };
}

export function createViewLinkResolver(
  view: PublicContentView,
): PropertiesLinkResolver {
  return (target) => {
    const key = target.trim();
    if (!key) return null;
    const entry =
      view.findRoutableBySlug(key) ?? view.findRoutableByAlias(key)[0];
    return entry?.permalink ?? null;
  };
}
