---
title: Glossary
sidebar:
  label: Glossary
  order: 70
---

# Glossary

A categorized glossary of the concepts Riebeckite uses. Each entry gives a short definition and links to a term note, while the linked pages explain the topic in depth.

## Content and publication

- [Content](./content.md) — A content item after Markdown parsing and plugin processing. It carries frontmatter, rendered HTML, and a resolved public location, so Riebeckite works with the processed item rather than the raw file.
- [Content Source](./content-source.md) — The abstraction that discovers and reads content for the rest of the pipeline. The standard implementation reads a filesystem or an Obsidian vault, so the Content Manager never walks the filesystem directly.
- [Content Manager](./content-manager.md) — The component that turns scanned entries into a finished manifest. It resolves public locations, runs the Markdown and plugin pipeline, and builds the content graph and query indexes.
- [Content Entry](./content-entry.md) — One resolved content item in the manifest, identified by slug. It carries the permalink, public location, frontmatter, publishing state, HTML, and plugin-contributed data.
- [Content ID](./content-id.md) — A stable identifier written in frontmatter that names a note independently of its slug and permalink. It survives file moves and URL changes, so it is the right key for external references.
- [Content Collection](./content-collection.md) — A grouping of content entries produced for queries, defined by a kind such as tags, folder, date, or a frontmatter field. Taxonomy pages, archives, and series lists are built from collections.
- [Content Graph](./content-graph.md) — The network of relationships between content entries, built from resolved wikilinks and Markdown links. It answers which notes link to which and supports backlink and neighborhood queries.
- [Content Index](./content-index.md) — The lowercase name-to-note map used to resolve wikilinks and embeds. A name that matches more than one note is left out and reported as a diagnostic instead of resolving to the wrong target.
- [Content Dependency](./content-dependency.md) — A recorded relationship showing that one entry's output depends on another entry. When the dependency changes, the dependent entry is reprocessed so derived content stays correct.
- [Manifest](./manifest.md) — The build-time record of all content, with entries, public views, lookup maps, the content graph, and diagnostics. Pages, runtime queries, incremental builds, and inspection all read from the manifest.
- [Slug](./slug.md) — The internal lookup key for a note, used by the content index, the manifest, and the content graph. It is not the public URL; consumers read the permalink from the resolved public location instead.
- [Logical Path](./logical-path.md) — The location of a content file inside the content root, expressed relative to that root. Riebeckite keeps the logical path stable and maps it to a public path separately.
- [Permalink](./permalink.md) — The resolved canonical public URL for a note. It is the single source of truth for links, feeds, sitemaps, and metadata, and it comes from location resolution rather than being recomputed from the slug.
- [Public Path](./public-path.md) — The path portion of a note's public URL, before the site origin is added. It is what a link uses after the permalink has been resolved.
- [Public Location](./public-location.md) — Where a note is published, combining the internal slug and the canonical permalink with optional redirects and metadata. It is the resolved result that the manifest exposes for each entry.
- [Redirect](./redirect.md) — An extra URL that points at a note's canonical permalink, usually to keep an older address working. Redirects are part of the resolved public location and do not replace the permalink.
- [Page](./page.md) — A routable piece of content that the site serves at a URL. A page is produced either from Markdown or by a plugin page type, and the integration renders it through a route.
- [Page Type](./page-type.md) — A kind of page that a plugin provides with its own public path and body, used for pages that are not ordinary Markdown. The integration resolves the route and the application assembles the final HTML.
- [Publication Boundary](./publication-boundary.md) — The rule that decides which content is safe to publish. Riebeckite applies the publish strategy and frontmatter and centralizes the decision rather than scattering publish checks.
- [Routable](./routable.md) — A publishing view that lists the entries the site serves at a URL, including unlisted ones. Routing and output generation use this view rather than the discoverable one.
- [Discoverable](./discoverable.md) — A publishing view that lists the entries allowed to appear in listings, feeds, and navigation. A routable but unlisted page is served at its URL yet kept out of this view.
- [Unlisted](./unlisted.md) — A publishing state where a page is served at its URL but kept out of listings and feeds. It is routable yet not discoverable, which suits share links and draft-like pages.
- [Publish](./publish.md) — The decision to include content in the published site, controlled by the publish strategy and frontmatter such as published and visibility. Published content enters the publication boundary views.
- [Draft](./draft.md) — Content that is kept out of the published site by the publish decision. Drafts can still be processed, but they are excluded from the routable and discoverable views until they are published.
- [Visibility](./visibility.md) — A frontmatter field that refines how a published page is exposed. It separates a listed page from an unlisted one without turning the page into a draft.
- [Pipeline](./pipeline.md) — The Markdown-to-HTML processing pipeline where Markdown is parsed to an mdast, remark plugins transform it, it is bridged to hast, and rehype plugins transform the HTML; Core drives it and plugins extend it.
- [Content Query](./content-query.md) — Selecting and filtering content entries by tag, folder, date, or a frontmatter field for listings and plugin data; used by taxonomy, series, and related posts.
- [WikiLink](./wikilink.md) — The `[[link]]` syntax that connects notes and creates relationships in the content graph. Riebeckite resolves it through the content index, and an unresolved link stays as a diagnostic.
- [Embed](./embed.md) — Syntax that pulls the content of another note into the current page, for example a note embed or a block embed. Embeds are resolved like links and are tracked as content dependencies.
- [Block ID](./block-id.md) — A short identifier attached to a paragraph or block so it can be linked or embedded directly. It makes a single block addressable without a heading.
- [Alias](./alias.md) — An alternative name for a note, recorded in the manifest as an extra lookup key. Aliases resolve wikilinks to the same note without changing its slug or permalink, and a name used twice becomes ambiguous.
- [Attachment](./attachment.md) — A file in the content tree that is served as an asset rather than a content entry. Attachments map to public URLs while keeping their logical path, and the publication boundary decides what is safe to expose.
- [Frontmatter](./frontmatter.md) — The YAML block at the top of a content file, parsed into typed metadata such as title, date, tags, and visibility. It also carries the stable id that identifies the note independently of its slug.
- [Taxonomy](./taxonomy.md) — Grouping of content by tags, folders, or date into listing pages such as /tags/. Taxonomy pages are built from content collections and use permalinks for their links.
- [Series](./series.md) — A grouping of content that belongs together in order, set through the series frontmatter field. A series list is built from a content collection over the same series value.
- [Folder Page](./folder-page.md) — A page that represents a folder rather than a single file, handled by the folder-pages plugin. It gives a directory an entry and a public URL while its children keep their own paths.

## Plugins and extension

- [Plugin](./plugin.md) — A Riebeckite plugin extends content interpretation, transformation, rendering, diagnostics, build-time processing, endpoints, and browser behavior through a defined contract.
- [Plugin cache](./plugin-cache.md) — Each plugin gets a per-plugin, regenerable build-time cache via `context.cache`; store only JSON-serializable values scoped to the plugin namespace.
- [Plugin dependency](./plugin-dependency.md) — Plugins declare capability requirements via `requires`; the resolver places providers before consumers and reports missing capabilities as `PluginDependencyError` with `kind` and `pluginName` diagnostics.
- [Capability](./capability.md) — A capability is a named feature that plugins can provide or require; resolution orders plugins and failures appear as structured diagnostics.
- [Lifecycle hook](./lifecycle-hook.md) — Plugin lifecycle hooks run once per ContentManager in order: `setup`, `buildStart`, content processing, `buildEnd`, and `dispose` (reverse resolved order). Named content hooks participate in resolved plugin order.
- [Content hook](./content-hook.md) — Content hooks join named phases of content processing: from config resolved through content loaded, post-parsed, post-processed, content graph, to manifest creation and diagnostics.
- [Hook context](./hook-context.md) — The plugin context passed to hooks includes `config`, `contentIndex`, `diagnostics`, `cache`, `output`, `logger`, `tracer`, and optionally `contentSource`; prefer framework services over global singletons.
- [Renderer](./renderer.md) — Renderers transform a content target into plugin-specific HTML; return `null` when the target is not handled so another renderer can participate. Examples include Canvas, Excalidraw, and attachment rendering.
- [Endpoint](./endpoint.md) — Endpoints declare reusable HTTP behavior for plugins; the integration connects the endpoint contract to the host router without embedding framework-specific routing in the plugin itself.
- [Client entry](./client-entry.md) — Client entries declare browser JavaScript initialization that is genuinely required at runtime; each entry has a plugin name, module specifier, optional export name, and public config passed to the initializer.
- [Island](./island.md) — Islands are client-hydratable components embedded within server-rendered content; they enable interactive UI sections without hydrating the entire page. Island components are defined by the site application, not plugins.
- [Plugin UI component](./plugin-component.md) — Plugins expose server-rendered Hono JSX components (and data helpers) plus CSS and optional client runtime; the Site decides where to render them. The former body-slot system was removed in favor of this.
- [Asset](./asset.md) — Plugin assets are stylesheets or other static resources declared through the `assets` array; they reach the browser through the integration's stylesheet pipeline and are not copied into `apps/web` directly.
- [Head tag](./head-tag.md) — Head tags and metadata for a page are contributed through the plugin system; the integration and site application compose the final `<head>` including title, description, and language attributes.
- [Diagnostics](./diagnostics.md) — Diagnostics are structured findings emitted by Core and plugins; they describe what the problem is, where it occurs, its severity, and how to fix it. Plugins report diagnostics through `addDiagnostics`; Core combines them for `check` and `doctor` commands.
- [Diagnostic code](./diagnostic-code.md) — Diagnostic codes are stable identifiers for categories of problems; core and plugins share a set of codes such as `duplicate-content-id`, `invalid-content-id`, and `content-integrity-*` for consistent reporting across `check` and `doctor`.
- [Diagnostic severity](./diagnostic-severity.md) — Severity levels (error, warn, info) proportionate to whether output can remain correct; errors prevent correct output, warnings indicate potential issues, and info provides contextual information.
- [Plugin options](./plugin-options.md) — Plugin options are configuration values passed to a plugin factory; they are validated through a pure `validateOptions` function with no side effects, and the resolved options are available on the plugin `options` property.

## Themes

- [Theme](./theme.md) — A theme controls the presentation layer of a Riebeckite site — colors, typography, spacing, layout, and article style — without changing content semantics or application structure.
- [Design Token](./design-token.md) — A named value such as a color, spacing, or font exposed as a CSS custom property (--rb-*) that flows through the cascade so components and themes can share a stable vocabulary.
- [Semantic Token](./semantic-token.md) — A design token referenced by meaning (e.g. body color, accent, border) rather than a theme-specific value, enabling theme swapping without component changes.
- [Color Mode](./color-mode.md) — The active color scheme among light, dark, and system. Controlled by the theme's `colorMode` option and the `data-theme` attribute on `<html>`, with runtime switching via JavaScript.
- [Typography](./typography.md) — The typographic configuration of the site — font families, sizes, line heights — applied through theme presets (`system`, `serif`, `sans`) via the `data-typography` attribute on the theme root.
- [CSS Contract](./css-contract.md) — The stable CSS hooks and cascade order that components may rely on. Themes expose documented hooks (rb-* and rr-*) so components can style without hardcoding a specific theme.
- [Theme Root](./theme-root.md) — The theme root selector (`[data-theme-root]` or `<html>`) that scopes token and attribute rules to the whole page. Color mode and typography attributes are applied here so the cascade reaches all elements.
- [Presentation Layer](./presentation-layer.md) — The presentation layer is the theme's responsibility — colors, fonts, spacing, layout, and article style. It does not include content semantics, routes, manifests, plugin behavior, or client scripts.
- [Article Layout](./article-layout.md) — The article layout preset (`article`, `sidebar`, `full-width`) determines the article area's presentation through the `data-article-layout` attribute on the theme root. It controls the width and sidebar configuration without changing the route or component tree.
- [userCss](./user-css.md) — Extra stylesheets that load last in the CSS cascade, allowing site authors to make final adjustments to the theme's appearance without forking the theme. userCss wins over theme CSS, plugin CSS, and config token styles.

## Build and operations

- [Build](./build.md) — The Riebeckite process that processes content, resolves locations, runs plugins, builds the manifest and graph, and writes the output.
- [Full Build](./full-build.md) — A build that runs without reusing previous incremental state, processing all content from scratch.
- [Incremental Build](./incremental-build.md) — A build mode that regenerates only what changed, using content dependencies and the stored build state.
- [Build State](./build-state.md) — The record of the previous build, stored under the build directory, that holds entries, fingerprints, dependencies, and output changes.
- [Build Dependency](./build-dependency.md) — The contract between Core and plugins that declares how processed content and emitted files depend on inputs between builds.
- [Output Dependency](./output-dependency.md) — Output dependencies decide which emitted files are affected by content changes and need to be regenerated.
- [Fingerprint](./fingerprint.md) — A hash that identifies a content or file input so the build can detect changes and drive cache/build-state comparison.
- [Cache](./cache.md) — Reusable build data that Riebeckite stores under `.riebeckite/` to avoid repeating expensive work. A cache is always an optimization: removing it changes build speed, never the published output.
- [Cache Invalidation](./cache-invalidation.md) — The step that drops cached content whose recorded dependencies or fingerprints changed. Invalidated entries are reprocessed and, if they feed other entries, the change propagates.
- [Cache Version](./cache-version.md) — The schema version of the persistent content cache that controls compatibility and migration between cache schema versions.
- [Persistent Cache](./persistent-cache.md) — Per-content cache that stores processed Markdown results between builds under `.riebeckite/cache/content/vN`. A cache hit makes a build warm; a miss forces reprocessing.
- [Output Cache](./output-cache.md) — The SSG output cache at `.riebeckite/ssg-output-cache.json` that stores rendered output routes and files for incremental SSG reuse. It is restored between CI runs so incremental SSG works in GitHub Actions; a cache that fails its checks is discarded.
- [Output Inventory](./output-inventory.md) — The record of every generated output, keyed by path, built from public entries, redirects, plugin pages, and generated outputs. The build compares it with the previous one to find affected, unchanged, and removed outputs.
- [Generated Output](./generated-output.md) — Output produced by a plugin, distinct from content outputs. Generated outputs have owners and dependencies, and their regeneration is driven by output dependency declarations.
- [SSG](./ssg.md) — Static site generation in Riebeckite, where the build renders the site to static files ahead of time. Core handles content and locations, and the integration connects to HonoX and Vite to render routes and write output.
- [Deterministic Build](./deterministic-build.md) — A build that produces the same output given the same inputs, ensured by consistent fingerprints, pipeline versioning, and configuration snapshots.
- [Check](./check.md) — The CLI command that validates the configuration, plugins, and capabilities are set up correctly before a build.
- [Doctor](./doctor.md) — The CLI command that diagnoses the project broadly, checking environment, config, plugins, content, and build state.
- [Inspector](./inspector.md) — A read-only CLI command for viewing already-resolved state, including config, plugins, content, graph, and build state.
- [Profiler](./profiler.md) — The build-time measurement of where time goes, from content processing to plugin hooks and output generation. It reads trace spans and reports timings for the build.
- [Trace Span](./trace-span.md) — A timed unit of build work. Traces divide build work into spans and record their duration. Span names should be stable (e.g., `content.load`, `plugins.run`, `diagnostics.run`, `application.build`).
- [Logger](./logger.md) — The observability channel used across the build to emit structured events and spans. Its output is consumed by the CLI, the profiler, and the integration.
- [Orphan](./orphan.md) — Content or assets that are not referenced by any published page or other content. Orphans may indicate removed content that still exists, or content that should be cleaned up.
- [Unused Asset](./unused-asset.md) — An asset (image, file, etc.) that is not referenced by any content's frontmatter or content. Unused assets may be safely removed to reduce output size.

## Configuration and delivery

- [Preset](./preset.md) — A prepared set of options applied to a config to cover a common setup. Presets bundle common plugins, themes, and settings so a site can opt in with little configuration.
- [Config](./config.md) — The Riebeckite configuration object that controls content, publishing, plugins, themes, and cache behavior. It is validated and resolved before the build uses it.
- [Root](./root.md) — A base directory that Riebeckite resolves other paths against, such as the application root and the content root. Resolving against a stable root keeps paths portable across machines.
- [Publish Strategy](./publish-strategy.md) — The configuration value that decides how content becomes public, such as publishing everything or only content marked for publishing. It sets the default side of the publication boundary.
- [Localization](./localization.md) — The l10n plugin that lets one site serve content in several languages. It detects a note's language, groups translations, and publishes a language switcher.
- [Translation](./translation.md) — The link between versions of the same content in different languages, set through frontmatter. Translations let links and the graph follow the reader's language.
- [Language Switcher](./language-switcher.md) — The control that lets a reader move between the language versions of a page. The l10n plugin exposes it, and the Site renders it when translations exist.
- [Locale](./locale.md) — The language and region identifier a site or page is written for, such as en or ja. The default locale decides which language is served without a URL prefix.
- [Hreflang](./hreflang.md) — The link metadata that tells search engines which URLs are language alternates of a page. Riebeckite generates it from the translations that exist for a note.
- [Feed](./feed.md) — A machine-readable list of published content, such as RSS, Atom, or JSON Feed. Feeds draw from the discoverable entries and use each entry's permalink.
- [Deployment](./deployment.md) — The step that places the built site on a hosting target. The build produces the manifest and generated outputs, and the integration connects them to a platform such as Cloudflare Workers.
- [Integration](./integration.md) — The package that connects Core's content and pages to a rendering and deployment stack, such as HonoX and Vite. It renders routes and writes output without owning content logic.
- [Runtime](./runtime.md) — The phase after the build where the site serves pages and answers queries. Runtime code reads the manifest and page data rather than reprocessing content.
- [Site Config](./site-config.md) — The SiteConfig fields (title, description, author, baseUrl, locale, twitterSite, defaultOgImage, feed) that describe the site and drive SEO, feeds, and locale.
- [Navigation](./navigation.md) — Site navigation configuration and the navigation plugin that renders header/footer links from the resolved manifest.
- [Route](./route.md) — The URL path the integration resolves to a page; produced from the page's public path and rendered by the framework (HonoX).
- [Sitemap](./sitemap.md) — A generated sitemap/robots listing discoverable URLs for search engines, built from the manifest.
- [Search](./search.md) — The build-time search index and plugin that let readers query content, built from the manifest.

## Authoring and integration

- [Obsidian Vault](./obsidian-vault.md) — Riebeckite can read an existing Obsidian vault as its content directory, allowing you to publish selected notes without reorganizing the vault.
- [Tag](./tag.md) — A tag groups content entries by a shared label, generating listing pages at `/tags/<slug>` with RSS/Atom/JSON feeds and related-tag navigation.
- [Shortcode](./shortcode.md) — A generic shortcode system using `remark-directive` syntax, supporting inline (`:name[label]{key=value}`), block (`::name[label]{key=value}`), and container (`:::name[label]{key=value}` … `:::` ) shortcodes with a built-in registry.
- [Callout](./callout.md) — A callout box using container shortcode syntax `:::callout[Title]{type=warning}` or `:::note[Title]{type=info}`, rendering as a `div` with CSS classes `rr-callout rr-callout--{type}` and built-in default titles.
- [Sidenote](./sidenote.md) — Tufte-style side notes that rewrite footnote markup into inline references and margin notes (desktop) or popovers (mobile), using a small client entry (`initSidenotes`) to toggle mobile popover behavior.
- [Backlink](./backlink.md) — Backlink list rendering showing which published notes link to the current note, using `getPublishedBacklinks()` to resolve incoming links from the content manifest, filtered to publicly discoverable notes and sorted in manifest order.
- [Site](./site.md) — The site application owns routes, the document frame, metadata, and HTML safety. It connects Riebeckite core behavior to HonoX and Vite through the `@riebeckite/honox` integration, deciding how plugin contributions are composed into the final public UI.
- [UI](./ui.md) — UI primitives provided by `@riebeckite/honox/ui` are a small structural contract, not a component framework. Primitives include `Article`, `ArticleLayout`, `ArticleContent`, `ArticleBody`, `ArticleMeta`, `ArticleFooter`, `Sidebar` with stable CSS hooks (`rb-article`, `rb-article-layout`, etc.).
