# Content reference

## Source of truth

Use `riebeckite_context`, `riebeckite_diagnostics`, and `riebeckite_links` when MCP is configured. Otherwise inspect `riebeckite.config.ts`, the target file, and nearby content before editing.

Content belongs in `{{content-directory}}/`. Preserve unrecognised frontmatter, line endings, and the Markdown style already used by the project.

## Route-affecting changes

Before renaming, moving, deleting, or changing a page's permalink:

- identify inbound links, embeds, aliases, and redirects;
- retain or add an alias/redirect when the old public URL must continue to work;
- check locale and publication state as well as the file path;
- do not infer a link target from a filename when the reference is ambiguous.

New public pages normally need `publish: true`. Do not add it when neighbouring content uses a different publication convention.

## Validation

Run `npm run check` after content changes. Also run `npm run build` when a route, asset, embed, frontmatter that affects output, or publication state changed. Report broken or unresolved links rather than silently replacing them.
