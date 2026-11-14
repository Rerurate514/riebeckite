import {
  addNote,
  appendParagraph,
  appendWikilink,
  deleteNote,
  editAsset,
  editFrontmatter,
  moveNote,
} from "./lib/vault.mjs";
export const SCENARIO_DEFINITIONS = {
  cold: { name: "cold", warm: false },
  warm: { name: "warm" },
  "single-edit": {
    name: "single-edit",
    prepare: ({ directory, config, size }) =>
      appendParagraph(directory, config.depth, size - 1, "Single edit."),
  },
  "link-edit": {
    name: "link-edit",
    prepare: ({ directory, config, size }) =>
      appendWikilink(directory, config.depth, size - 1, 0),
  },
  "title-edit": {
    name: "title-edit",
    prepare: ({ directory, config, size }) =>
      editFrontmatter(directory, config.depth, size - 1, (yaml) =>
        yaml.replace(/^title:.*/m, "title: Edited title"),
      ),
  },
  add: {
    name: "add",
    prepare: ({ directory, config, size }) =>
      addNote(directory, config.depth, size),
  },
  delete: {
    name: "delete",
    prepare: ({ directory, config, size }) =>
      deleteNote(directory, config.depth, size - 1),
  },
  "frontmatter-edit": {
    name: "frontmatter-edit",
    prepare: ({ directory, config }) =>
      editFrontmatter(directory, config.depth, 0, (yaml) =>
        yaml.includes("tags:")
          ? yaml.replace(/tags:.*/, 'tags: ["edited-tag"]')
          : `${yaml}\ntags: ["edited-tag"]`,
      ),
  },
  "public-draft": {
    name: "public-draft",
    prepare: ({ directory, config }) =>
      editFrontmatter(directory, config.depth, 0, (yaml) =>
        yaml.replace(/^visibility:.*/m, "visibility: draft"),
      ),
  },
  "hub-edit": {
    name: "hub-edit",
    prepare: ({ directory, config }) =>
      appendParagraph(directory, config.depth, 0, "Hub edit."),
  },
  rename: {
    name: "rename",
    prepare: ({ directory, config }) =>
      moveNote(directory, config.depth, 0, "archive/note-00000.md"),
  },
  "asset-edit": {
    name: "asset-edit",
    prepare: ({ directory }) => editAsset(directory, 0, "png", "asset changed"),
  },
  "config-edit": {
    name: "config-edit",
    configMutate: (config) => ({
      ...config,
      site: { ...config.site, title: "Benchmark Edited" },
    }),
  },
  "plugin-edit": {
    name: "plugin-edit",
    pluginVersion: "v2",
  },
};
