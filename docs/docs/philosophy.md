---
date: 2026-11-02
title: Design Philosophy
sidebar:
  label: Design Philosophy
  order: 5
---
# Design Philosophy

Riebeckite turns Markdown and Obsidian notes into a static site built with HonoX and Vite. It does not import content into a proprietary format, and it returns the generated site as an ordinary HonoX application. It is not a hosted service, a CMS, or a new Markdown dialect.

The project started because publishing a personal knowledge base was more work than writing it. With Quartz 4, the content survived but the site around it did not survive framework updates. Riebeckite moves the boundary: Markdown is the input, the site stays ordinary code, and extensions are npm packages.

Content should outlive the tool that publishes it. A note should remain readable in a text editor, a Git repository, or another static-site generator. A generated site should be inspectable, editable, and deployable without a Riebeckite account. Interaction is added only where a feature needs it.

This page is not a feature list. It is the standard for Riebeckite's own development and a guide to the trade-offs users meet. Where the implementation falls short, the gap is a bug or a decision to make, not a reason to rewrite the principle. See [Architecture](./framework/architecture.md) for implementation details, and [Design Philosophy in Detail](./philosophy-details.md) for the background and evidence.

## Principles at a Glance

| Principle | Summary |
| --- | --- |
| Content First | Markdown and frontmatter are the source of truth, readable and movable without the framework. |
| Own Your Web | The output belongs to its owner and remains an ordinary HonoX application you can edit and deploy. |
| Standards over Invention | Build on Markdown, HTML, CSS, HonoX, and Vite; add a custom API only when it encodes an invariant. |
| Static First, Interactive When Needed | Reading works as HTML; browser code is added only for features that need it. |
| Explicit over Implicit | Publication, dependencies, and cache decisions are visible and inspectable. |

## Core Principles

The list is deliberately short. Some candidates are folded into others: extensibility follows from Small Core, Explicit Contracts; observability is part of Explicit over Implicit; local-first content is part of Content First and Own Your Web.

### Content First

Markdown and frontmatter are the source of truth. Riebeckite transforms them during a build, but the content must remain ordinary Markdown that can be read and moved without the framework.

- `content.directory` can point to a folder inside the site, a sibling folder, an external repository, or an Obsidian vault. The content does not have to live inside `app/` or inside the site repository.
- A public location can be resolved independently of the filesystem path. Moving a content repository does not have to change its public URLs.
- Themes cannot change content, routes, the manifest, the graph, plugin behavior, or client behavior. Appearance is a separate concern.
- Publication is a content decision. By default a note is published only with `publish: true`; `draft`, `private`, `visibility`, and `publishAt` express the other states.

The boundary: Riebeckite does transform Markdown, and some site-specific frontmatter and syntax are Riebeckite extensions. Not every Obsidian feature is supported. The [Obsidian guide](./guides/obsidian.md) describes verified compatibility rather than an aspiration.

### Own Your Web

The generated site belongs to the person who generated it. Riebeckite provides packages and a build, not a platform that owns the result.

- `create-riebeckite` produces a normal HonoX application with `app/`, `riebeckite.config.ts`, and a `package.json`. You can edit routes, components, styles, and islands with standard TypeScript, JSX, HTML, and CSS.
- Riebeckite packages are dependencies. You update them with your package manager; you do not wait for a hosted editor or export your site from a service.
- The build writes static files to `dist/`. You can deploy that output to Cloudflare Workers, GitHub Pages, Netlify, Vercel, or another static host. Deployment is a site decision, not a Riebeckite lock-in.

The boundary: owning the site also means owning upgrades and custom code. Before 1.0, minor releases may contain breaking changes. Riebeckite does not guarantee that custom routes or components will migrate automatically. Review the [Upgrading guide](./guides/upgrading.md) before a major or minor upgrade.

### Standards over Invention

Riebeckite uses existing formats and tools unless a Riebeckite-specific contract is genuinely needed.

- Content uses Markdown, GFM, frontmatter, and verified Obsidian syntax. The site uses TypeScript, JSX, HonoX, Vite, HTML, CSS, and npm.
- Custom syntax is optional. Shortcodes are a plugin built on `remark-directive`, not a replacement for Markdown and not a requirement for using Riebeckite.
- A Riebeckite API is justified when it encodes an invariant that the underlying standards do not define. Examples include resolved public locations, publication visibility, the plugin lifecycle, and the Interactive Runtime lifecycle.
- A custom API must be documented, public where it is meant for plugins or themes, and narrow enough that it does not become a parallel standard.

The boundary: "Standards over invention" does not mean "never invent". Riebeckite-specific frontmatter such as sidebar metadata exists because a published site needs behavior that Markdown does not express. The test is whether the new contract carries a real invariant, not whether it is novel.

### Static First, Interactive When Needed

The default output is static HTML. Interactivity is an explicit addition, not the baseline.

- Pages are generated at build time and render without JavaScript for reading. Navigation, article content, and metadata are part of the HTML output.
- Browser code is added through client entries and islands only where a feature needs it. A client entry is loaded only on pages that use it.
- SPA navigation is optional. The [Interactive Runtime](./framework/interactive-runtime.md) loads only on pages with a plugin marker, and it is expected to ship a static fallback.
- If a result can be computed at build time, compute it at build time.

The boundary: some features need JavaScript. Search UI, a theme toggle, SPA navigation, and interactive widgets are examples. Riebeckite does not promise that every plugin works without JavaScript, and it does not forbid request-time endpoints when a feature cannot be precomputed. "Static first" is a priority, not a prohibition.

### Explicit over Implicit

Decisions that affect published output should be visible, recorded, or inspectable. A user should not have to guess why a page appeared, where it was published, or why a build was reused.

- Publication is explicit by default: a note is published only with `publish: true`. The public URL is resolved through a public location, not guessed from a filesystem path or slug at request time.
- Plugin order and dependencies are declared. Plugins are expected to use the smallest extension point they need.
- Caches store a result only when its dependencies are known. Unknown dependencies are not persisted, and uncertain reuse falls back to recomputation.
- Diagnostics, Doctor, and Inspector are read-only. They report problems and resolved state; they do not silently rewrite content or configuration.
- Provenance records build inputs and outputs without changing the generated site. It is evidence, not a deploy gate.

The boundary: defaults and conventions are compatible with this principle when they are documented and inspectable. Explicit does not mean that every site must spell out every behavior. Some hook effects are recorded as opaque because their dependencies cannot be proven.

## Implementation Principles

These are how the core principles hold in the implementation. See [Architecture](./framework/architecture.md) and [Boundaries](./framework/architecture/boundaries.md) for the concrete packages and flows.

**The build is the source of truth.** Content interpretation happens once, during the build, and runtime code serves the prepared result. It does not re-parse Markdown or re-resolve publish strategies. `.riebeckite/` is build-time state and must not be read or written by a runtime request. A failed build does not replace the previous valid output. Request-time endpoints and the SPA runtime exist, but they must not re-interpret content.

**Small core, explicit contracts.** Core owns shared, framework-independent contracts and orchestration. Plugins own content behavior, themes own appearance, integrations connect Core to HonoX and Vite, and applications own routes and components. Dependencies point inward, and a contract belongs in Core only when more than one outer layer needs it. Official plugins and themes use the same public contracts as external packages.

**Correctness before optimization.** A correct full build is the baseline. Caches, incremental builds, and output reuse are optimizations that must preserve the same published site. Missing, incompatible, malformed, or uncertain state causes a safe fallback to full work. Build state is written only after a successful build, and uncertain reuse rebuilds.

**Security at trust boundaries.** Riebeckite trusts the site owner, plugins, themes, and local content. It does not trust external input, third-party content, or browser data. Markdown-authored HTML is filtered by Core's allowlist sanitizer before plugin HTML transforms. Plugin-generated HTML is trusted application code, and Core does not sandbox it. The publication boundary is resolved at build time; unlisted content is routable but not discoverable. Secrets and absolute local paths must not appear in public output, client entries, logs, or provenance.

## Trade-offs

The principles are not a total order. This table gives the default and the conditions that reverse it. Security and publication boundaries are constraints, not weights: convenience does not override them. Reversing a default requires evidence such as measurements, tests, or a migration path. Each conflict's evidence and examples are in [Design Philosophy in Detail](./philosophy-details.md).

| Conflict | Default | Reverse when |
| --- | --- | --- |
| Obsidian compatibility vs. Riebeckite extensions | Preserve the meaning of Markdown and Obsidian syntax. Add extensions as optional, documented plugins; do not silently reinterpret existing syntax. | A site-specific need has no standard equivalent. Add a documented extension, compatibility tests, and a fallback. |
| Config simplicity vs. customization | Keep typed configuration small and use presets and conventions. Put customization in a plugin, theme, or application code. | Many sites need the same behavior. Add a typed option with validation, a documented default, and a migration path. |
| Static generation vs. runtime interactivity | Precompute at build time. Add browser code only to the pages that need it. | A search query, endpoint, or interactive widget genuinely needs request-time computation or input. |
| Performance vs. correctness and reproducibility | Correctness and reproducibility win. Caches are optional, dependency-tracked, and safe to delete. | Dependency tracking and invalidation tests exist, and the benefit is measured under stated conditions. |
| Extensibility vs. Core simplicity | Try the plugin, theme, integration, or application first. | Multiple outer layers need the same framework-independent invariant. |
| Automation vs. explicitness | Make destructive or high-impact actions staged and explicit. Automate safe, reversible work. | Manual work does not scale, and there is a dry run, journal, rollback path, and verification. |
| User freedom vs. safety | Preserve freedom in structure, routes, presentation, and deployment. Enforce safety at trust boundaries. | The user explicitly opts into a trusted extension point with documented consequences. |
| Existing API preservation vs. architecture improvement | Preserve public APIs and provide a migration path. Pre-1.0 minor releases may break; from 1.0 onward, follow semantic versioning. | A boundary is wrong or unsafe. Change it with a migration path and tests. |

## Non-goals

A non-goal is something Riebeckite does not intend to own. It is not a claim that the feature is impossible or unimportant. Anything not listed here as unsupported may change if the need and design are strong enough. Individual limitations are documented on the relevant plugin and guide pages. Unsettled limits and proposed non-goals are recorded in [Design Philosophy in Detail](./philosophy-details.md).

**Intentional non-goals**

- **Reimplementing Obsidian.** Riebeckite reads Obsidian-flavored Markdown and selected syntax. It does not run Obsidian plugins or reproduce the vault application. The [Obsidian guide](./guides/obsidian.md) lists verified behavior.
- **Replacing Markdown with a Riebeckite language.** Core uses Markdown and GFM. Optional syntax is built on standard parsers and shipped as a plugin.
- **Replacing HonoX, Vite, or the web platform.** The generated site is an ordinary HonoX application. The integration connects Riebeckite to HonoX and Vite; Core does not reimplement them.
- **Operating a hosting service.** The build writes static files to `dist/`. Deployment guides target external providers, and `publish` automates a provider rather than hosting the site.
- **Putting every feature in Core.** Reusable features belong in plugins; appearance belongs in themes; framework glue belongs in integrations; site behavior belongs in the application.
- **Delivering a client-JavaScript-only site.** The reading experience is static HTML. Browser code is an optional enhancement.

**Architecturally constrained**

- Runtime code cannot depend on `.riebeckite/`, plugin caches, or local build files.
- Themes cannot add routes, JSX, client scripts, or plugins.
- Core cannot depend on HonoX, Vite, a specific plugin, a theme, or a site application.
- Installed plugin code is trusted and is not sandboxed by Core.
- Unlisted content must not appear in public discovery surfaces.
- The final published state is decided at build time, not by a runtime request.

## Design Decision Guidelines

Use these questions before adding a feature, a configuration field, a syntax extension, or a public API. The order is not a ranking; the trade-offs above decide conflicts.

1. Is this a problem Riebeckite should solve, or a concern of one site or application?
2. Can Markdown, Obsidian syntax, HTML, CSS, HonoX, Vite, or another existing standard solve it already?
3. Is a new Riebeckite API, syntax, or abstraction truly necessary? Which invariant does it encode?
4. Which layer owns it: Core contract, plugin, theme, integration, application, or CLI?
5. Can it be a plugin instead of Core? Can it be optional or disabled?
6. Can it be done at build time instead of in the browser?
7. If runtime behavior is required, is there a static fallback and a clear trust boundary?
8. Is the behavior inspectable and diagnosable through diagnostics, `inspect`, provenance, or logs?
9. Does it preserve publication boundaries, sanitization, secret handling, accessibility, and data ownership?
10. Does it avoid making future upgrades and migrations unnecessarily hard? Is there a rollback or migration path?
11. Is the public API needed by external plugins or themes, and can official code use only that public API?
12. If the change deviates from a principle, is the deviation recorded with its context and consequences?

Important deviations are recorded as Architecture Decision Records under [`docs/agents/adr/`](../agents/adr/README.md). Write one for a public contract change, an architecture boundary change, an intentional exception to a principle, a security or publication exception, or a release policy change. For most other changes, the pull request or issue is enough: state the problem, the decision, the alternatives, and the consequence. A deviation is not a failure. An unrecorded deviation is.

User-facing changes are recorded separately as change entries under `changes/unreleased/`. The entries are validated before a release and generate the changelog, the [release notes](./releases.md), and GitHub Releases from one source. See [Release Operations](./framework/release.md) for the workflow.

## Related Documentation

- [Getting Started](./getting-started/README.md) for building a first site.
- [Architecture](./framework/architecture.md) for package boundaries and dependency direction.
- [Content System](./framework/content-system.md) for sources, identity, public locations, and the manifest.
- [Plugin System](./framework/plugin-system.md) for extension points and plugin responsibilities.
- [Theme System](./framework/theme-system.md) for the appearance boundary.
- [Build System](./framework/build-system.md) for incremental builds, caches, and safe fallback.
- [Interactive Runtime](./framework/interactive-runtime.md) for browser-side behavior with a static fallback.
- [Security](./security.md) for the trust model and sanitization rules.
- [Publication workflow](./guides/deployment/publication-workflow.md) for planning, approval, and deployment.
- [Reference](./reference/README.md) for configuration, CLI, and public APIs.
- [Glossary](./glossary/README.md) for terms used across the documentation.
