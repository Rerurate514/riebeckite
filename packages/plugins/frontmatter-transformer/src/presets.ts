import {
  type ContentMigrationDefinition,
  createContentMigrationRegistry,
  defineContentMigration,
} from "@riebeckite/core";

export type FrontmatterPreset = {
  readonly id: string;
  readonly description: string;
  readonly migration: ContentMigrationDefinition;
};

export const FRONTMATTER_PRESETS: readonly FrontmatterPreset[] = [
  {
    id: "normalize-tags",
    description: "Split and deduplicate string or comma-separated tags.",
    migration: defineContentMigration({
      id: "normalize-tags",
      version: 1,
      description: "Normalize frontmatter tags to a deduplicated list.",
      rules: [{ kind: "frontmatter-normalize-list", key: "tags" }],
      reversible: { description: "Restore the previous tag values." },
    }),
  },
  {
    id: "trim-text",
    description:
      "Trim leading and trailing whitespace in title and description.",
    migration: defineContentMigration({
      id: "trim-text",
      version: 1,
      description: "Trim text frontmatter fields.",
      transform(content) {
        const set: Record<string, string> = {};
        const remove: string[] = [];
        for (const key of ["title", "description"] as const) {
          const value = content.frontmatter[key];
          if (typeof value !== "string") continue;
          const trimmed = value.trim();
          if (trimmed) set[key] = trimmed;
          else remove.push(key);
        }
        return { set, remove };
      },
      reversible: { description: "Restore the previous text values." },
    }),
  },
  {
    id: "remove-empty-fields",
    description: "Remove empty description, image, tags, and aliases fields.",
    migration: defineContentMigration({
      id: "remove-empty-fields",
      version: 1,
      description: "Remove empty optional frontmatter fields.",
      transform(content) {
        const remove = ["description", "image", "tags", "aliases"].filter(
          (key) => isEmpty(content.frontmatter[key]),
        );
        return { remove };
      },
      reversible: { description: "Restore the removed empty fields." },
    }),
  },
];

export function frontmatterPresetRegistry(ids?: readonly string[]) {
  const selected =
    ids === undefined || ids.length === 0
      ? FRONTMATTER_PRESETS
      : ids.map((id) => {
          const preset = FRONTMATTER_PRESETS.find((entry) => entry.id === id);
          if (!preset) {
            throw new Error(
              `Unknown frontmatter preset "${id}". Available presets: ${FRONTMATTER_PRESETS.map((entry) => entry.id).join(", ")}.`,
            );
          }
          return preset;
        });
  return createContentMigrationRegistry(
    selected.map((preset) => preset.migration),
  );
}

function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}
