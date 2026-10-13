---
title: Glossary
sidebar:
  label: Glossary
  order: 70
---

# Glossary

Short definitions of the concepts Riebeckite uses. Each entry links to a term note, and the linked page explains it in depth.

## Content and publication

- [Content](./content.md) — A content item after Markdown parsing and plugin processing, with frontmatter, rendered HTML, and a resolved public location.
- [Content Source](./content-source.md) — The abstraction that discovers and reads content for the rest of the pipeline.
- [Content Manager](./content-manager.md) — The component that turns scanned entries into a finished manifest.
- [Content Entry](./content-entry.md) — One resolved content item in the manifest, identified by slug.
- [Content Collection](./content-collection.md) — A grouping of content entries produced for queries, defined by a kind such as tags, folder, date, or a frontmatter field.
- [Content Graph](./content-graph.md) — The network of relationships between content entries, built from resolved wikilinks and Markdown links.
- [Content Index](./content-index.md) — The lowercase name-to-note map used to resolve wikilinks and embeds.
- [Manifest](./manifest.md) — The build-time record of all content, with entries, public views, lookup maps, the content graph, and diagnostics.
- [Slug](./slug.md) — The internal lookup key for a note, used by the content index, the manifest, and the content graph.
- [Permalink](./permalink.md) — The resolved canonical public URL for a note.
- [Public Location](./public-location.md) — Where a note is published, combining the internal slug and the canonical permalink with optional redirects and metadata.
- [Page](./page.md) — A routable piece of content that the site serves at a URL.
- [Page Type](./page-type.md) — A kind of page that a plugin provides with its own public path and body, used for pages that are not ordinary Markdown.
- [Publication Boundary](./publication-boundary.md) — The rule that decides which content is safe to publish.
- [Routable](./routable.md) — A publishing view that lists the entries the site serves at a URL, including unlisted ones.
- [Discoverable](./discoverable.md) — A publishing view that lists the entries allowed to appear in listings, feeds, and navigation.
- [Publish](./publish.md) — The decision to include content in the published site, controlled by the publish strategy and frontmatter such as published and visibility.
- [Draft](./draft.md) — Content that is kept out of the published site by the publish decision.
- [WikiLink](./wikilink.md) — The `[[link]]` syntax that connects notes and creates relationships in the content graph.
- [Embed](./embed.md) — Syntax that pulls the content of another note into the current page, for example a note embed or a block embed.
- [Alias](./alias.md) — An alternative name for a note, recorded in the manifest as an extra lookup key.
- [Attachment](./attachment.md) — A file in the content tree that is served as an asset rather than a content entry.
- [Frontmatter](./frontmatter.md) — The YAML block at the top of a content file, parsed into typed metadata such as title, date, tags, and visibility.
- [Taxonomy](./taxonomy.md) — Grouping of content by tags, folders, or date into listing pages such as /tags/.
- [Series](./series.md) — A grouping of content that belongs together in order, set through the series frontmatter field.
- [Folder Page](./folder-page.md) — A page that represents a folder rather than a single file, handled by the folder-pages plugin.

## Plugins and extension

- [Plugin](./plugin.md) — A reusable extension that adds features through Core's plugin contracts.
- [Plugin Cache](./plugin-cache.md) — Plugin-local storage for processed content, versioned by cacheVersion.
- [Plugin Dependency](./plugin-dependency.md) — A capability-based relationship between plugins.
- [Lifecycle Hook](./lifecycle-hook.md) — A plugin hook that runs at a build phase, such as setup, buildStart, buildEnd, or dispose.
- [Content Hook](./content-hook.md) — A plugin hook that observes or extends a content processing phase, such as onContentLoaded, onPostParsed, onPostProcessed, or onManifestCreated.
- [Renderer](./renderer.md) — A plugin capability that turns a source file into HTML.
- [Endpoint](./endpoint.md) — A route that a plugin exposes to the browser or an external service.
- [Client Entry](./client-entry.md) — A browser entry point that a plugin registers for client-side behavior.
- [Island](./island.md) — An interactive component that is hydrated on the client while the rest of the page stays static.
- [Slot](./slot.md) — A named position in a page layout where plugins can contribute HTML.
- [Diagnostics](./diagnostics.md) — Warnings and errors collected while content is processed, gathered in the manifest and read through the plugin runtime.
- [Diagnostic Code](./diagnostic-code.md) — A stable identifier attached to a diagnostic so tools can filter, group, and display issues.

## Themes

- [Theme](./theme.md) — A package that defines a site's appearance through CSS, design tokens, data attributes, and the cascade.
- [Design Token](./design-token.md) — A named value such as a color or spacing exposed as a CSS custom property.
- [Color Mode](./color-mode.md) — The active color scheme, chosen among system, light, and dark.
- [Typography](./typography.md) — The typographic configuration of the site, such as font families, sizes, and line heights.
- [CSS Contract](./css-contract.md) — The stable CSS hooks, such as data attributes, that components may rely on.
- [Theme Root](./theme-root.md) — The root element that a theme styles and scopes its tokens to.

## Build and operations

- [Build](./build.md) — The Riebeckite process that processes content, resolves locations, runs plugins, builds the manifest and graph, and writes the output.
- [Incremental Build](./incremental-build.md) — A build mode that regenerates only what changed, using content dependencies and the stored build state.
- [Build State](./build-state.md) — The record of the previous build, stored under the build directory, that holds entries, fingerprints, dependencies, and output changes.
- [Build Dependency](./build-dependency.md) — A declared input that affects a piece of content or output, such as another note, a file, a tag, or a folder.
- [Fingerprint](./fingerprint.md) — A hash that identifies a content or file input so the build can detect change.
- [Cache](./cache.md) — Reusable build data that can be stored and shared, configured under the cache settings.
- [Cache Invalidation](./cache-invalidation.md) — The step that drops cached content whose recorded dependencies or fingerprints changed.
- [Output Inventory](./output-inventory.md) — The record of every generated output, keyed by path, built from public entries, redirects, plugin pages, and generated outputs.
- [SSG](./ssg.md) — Static site generation in Riebeckite, where the build renders the site to files ahead of time.
- [Check](./check.md) — A CLI command that validates the site configuration and content for problems that would break a build, such as plugin dependency cycles and duplicate permalinks.
- [Doctor](./doctor.md) — A CLI command that checks the site setup and environment, verifying that integrations, themes, and the deployment target are ready.
- [Inspector](./inspector.md) — A read-only view of content entries and their resolved state, including locations, publishing state, the content graph, and diagnostics.
- [Profiler](./profiler.md) — The build-time measurement of where time goes, from content processing to plugin hooks and output generation.
- [Trace Span](./trace-span.md) — A named, timed interval in the build observability system, tagged with context such as a plugin hook or a cache lookup.
- [Logger](./logger.md) — The observability channel used across the build to emit structured events and spans.

## Configuration and delivery

- [Preset](./preset.md) — A prepared set of options that is applied to a config to cover a common setup.
- [Config](./config.md) — The Riebeckite configuration object that controls content, publishing, plugins, themes, and cache behavior.
- [Root](./root.md) — A base directory that Riebeckite resolves other paths against, such as the application root and the content root.
- [Localization](./localization.md) — The l10n plugin that lets one site serve content in several languages.
- [Translation](./translation.md) — The link between versions of the same content in different languages, set through frontmatter.
- [Hreflang](./hreflang.md) — The link metadata that tells search engines which URLs are language alternates of a page.
- [Feed](./feed.md) — A machine-readable list of published content, such as RSS, Atom, or JSON Feed.
- [Deployment](./deployment.md) — The step that places the built site on a hosting target.
