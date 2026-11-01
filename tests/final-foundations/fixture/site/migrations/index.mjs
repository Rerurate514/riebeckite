export default [
  {
    id: "legacy-fields",
    version: 1,
    description: "Convert legacy frontmatter.",
    rules: [
      { kind: "frontmatter-map", key: "category", map: (value) => [value] },
      { kind: "frontmatter-rename", from: "category", to: "tags" },
      { kind: "frontmatter-remove", key: "published" },
    ],
  },
  {
    id: "move-notes",
    version: 1,
    description: "Move notes into guides and move their permalinks.",
    dependsOn: ["legacy-fields"],
    rules: [
      { kind: "path-rename", from: "notes", to: "guides" },
      {
        kind: "permalink",
        permalink: "/guides/legacy",
        when: (content) => content.frontmatter.permalink === "/notes/legacy",
      },
    ],
  },
];
