import { definePlugin } from "@riebeckite/core";
import { resolveOptions } from "./permalink_options.js";
import { parseFrontmatter, resolveLocation } from "./permalink_resolve.js";
import type { PermalinkOptions } from "./permalink_types.js";
import { assertNoCollisions } from "./permalink_validate.js";

export type {
  PermalinkIdStrategy,
  PermalinkOptions,
  PermalinkPathMode,
  RedirectStatus,
} from "./permalink_types.js";

export function permalink(options: PermalinkOptions = {}) {
  const resolved = resolveOptions(options);
  return definePlugin({
    name: "permalink",
    options,
    resolveContentLocations: ({ entries }) => {
      const contents = entries.map((entry) => ({
        ...entry,
        frontmatter: parseFrontmatter(entry),
      }));
      const locations = contents.map((content) =>
        resolveLocation(content, options, resolved),
      );
      assertNoCollisions(locations, contents);
      return locations;
    },
  });
}
