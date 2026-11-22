# Content migration guide

Use this guide when a change spans more than a few content files or can alter public URLs.

## Define the plan

Record these before editing:

- Source set: exact directory, glob, or file list.
- Transformation: fields added, removed, or renamed; path moves; link rewrites.
- Expected route changes: old URL, new URL, and redirect decision.
- Exclusions: files intentionally untouched and why.
- Rollback: version-control revision, branch, or backup location.
- Success criteria: commands and pages to inspect.

A migration without an explicit source set and rollback path is not ready to run.

## Frontmatter safety

- Preserve unknown keys. They may be consumed by Plugins or the site's content format.
- Preserve quoting, ordering where practical, and the file's line endings.
- Do not normalize dates, booleans, or arrays unless the transformation requires it.
- Do not remove `private`, `draft`, `visibility`, or `aliases` to make a page appear.
- Remember that `published` is a publication or feed date, not the publish switch.
- Check `filters.publishStrategy`: under `explicit`, public pages need `publish: true`; under `selective`, `private` and `draft` control exclusion and `publish` is ignored.

## Route impact

| Change | Check |
| --- | --- |
| Move or rename a file | Old URL, new URL, inbound links, embeds, aliases, redirects. |
| Change a permalink or slug setting | Duplicate routes, old URL, canonical URL, sitemap. |
| Change `aliases` | Collisions, redirects, external references. |
| Change `locale` | Translation links, language switcher, canonical and alternate URLs. |
| Change visibility or publication | Listings, feeds, search, sitemap, redirects, private preview. |
| Delete a page | Inbound links, redirect, related content, assets. |

Use the resolved Public Location rather than guessing from the filename.

## Bulk frontmatter changes

Prefer `@riebeckite/plugin-frontmatter-transformer` when it supports the transformation. Configure it from its current documentation and keep the transformation declarative and reviewable.

If a one-off script is unavoidable:

- Read files through the project's content APIs or a reviewed parser, not ad hoc string replacement.
- Print a dry-run list of changes and totals before writing.
- Write only files in the declared source set.
- Keep a backup or work on a branch.
- Never rewrite unrelated frontmatter or body text.

## Batches

Use small batches that can be validated independently:

1. Structural move or rename.
2. Frontmatter transformation.
3. Link and embed rewrite.
4. Redirects and aliases.
5. Cleanup of intentionally removed files.

Run `npm run check` after each batch. Run `npm run build` before declaring the migration complete.

## Verification

```sh
npm run check
npm run build
npm exec riebeckite inspect content --list
npm exec riebeckite inspect graph
npm run doctor
```

Inspect:

- Old and new routes.
- Redirects and canonical URLs.
- Publication state and listings.
- Unresolved links and embeds.
- Feeds, sitemap, and search output when affected.
- The external content repository status when content lives outside the site repository.

## Rollback

Stop at the first unexpected route or publication change. Restore from version control or the backup, then revise the plan. Do not layer a second transformation over an unverified migration.

## Report

State the source set, transformation, exclusions, route changes, redirects, commands run, inspection results, and rollback path.
