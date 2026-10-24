import type { ContentIconRegistry, PublicContentView } from "@riebeckite/core";
import { buildPropertiesData, createViewLinkResolver } from "./model.js";
import { resolvePropertiesOptions } from "./options.js";
import type { PropertiesData, PropertiesOptions } from "./types.js";

export type { PropertiesData } from "./types.js";

export type GetPropertiesInput = {
  readonly view: PublicContentView;
  readonly frontmatter: Readonly<Record<string, unknown>>;
  readonly options?: PropertiesOptions;
  readonly icons?: ContentIconRegistry;
};

export function getProperties({
  view,
  frontmatter,
  options,
  icons,
}: Readonly<GetPropertiesInput>): PropertiesData {
  return buildPropertiesData(frontmatter, resolvePropertiesOptions(options), {
    resolveLink: createViewLinkResolver(view),
    ...(icons === undefined ? {} : { icons }),
  });
}
