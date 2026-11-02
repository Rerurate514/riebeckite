---
date: 2026-11-02
title: Design Philosophy in Detail
sidebar:
  label: Design Philosophy in Detail
  order: 6
---
# Design Philosophy in Detail

This page holds the background and evidence behind the [Design Philosophy](./philosophy.md). The main page is the summary; this page keeps the reasoning, boundaries, and examples that would otherwise make it long.

## Motivation

Riebeckite started from a practical problem: publishing a personal knowledge base was more work than writing it. Quartz 4 was a useful starting point, but its client-side UI was organized around Hooks and DOM changes rather than a component model. Keeping the vault and the site separate was awkward, and moving from Quartz 4 to 5 meant rebuilding much of the site. The content was durable; the site around it was not.

The problem was not a missing feature. It was the boundary between content, site, and framework. Riebeckite moves that boundary:

- Markdown is the input, not the architecture. The content model does not depend on the rendering framework.
- The generated site is an ordinary HonoX application. You own its routes, components, islands, CSS, and configuration.
- Extensions are npm packages. A plugin or theme is a dependency, not a privileged integration into a platform.

Compared with a generator built around a fixed theme, Riebeckite exposes the generated application. Compared with a general web framework, Riebeckite starts from Markdown and publication semantics. The promise is narrower than either: Riebeckite handles content interpretation and the build; the site remains ordinary code.

## Vision

Content should outlive the tool that publishes it. A note should still make sense in a text editor, a Git repository, or another static-site generator. Riebeckite may transform content during a build, but it must not make the source depend on Riebeckite to be readable.

The site should outlive a framework version. A generated site should be something you can inspect, edit, and deploy without a Riebeckite account. Updating Riebeckite should normally be a dependency update, not a rewrite, even though major versions and pre-1.0 minor releases can require changes.

Interaction should be earned. A site should work as static HTML first, and add browser code only where the feature needs it. The framework should be easy to leave at the edges: content is Markdown, the site is HonoX code, and extensions are packages.

## Architectural Principles in Detail

The core principles describe what Riebeckite values. The architectural principles describe how the implementation keeps those values true. The [Architecture](./framework/architecture.md) and [Boundaries](./framework/architecture/boundaries.md) pages describe the concrete packages and flows.

### The Build Is the Source of Truth

Content interpretation happens once, during the build. The build resolves content identity, publication state, public locations, the manifest, the graph, derived data, and the final routes. Runtime code serves the prepared result.

In practice:

- Runtime code reads generated application output and stable content data. It does not re-parse Markdown, re-run localization detection, or re-resolve publish strategies.
- `.riebeckite/` is build-time state. It is not a runtime dependency, and a Worker request must not read or write it.
- A failed build does not replace the previous valid output. Incremental state is updated only after a successful build.

The boundary: request-time endpoints and the SPA runtime exist. They may compute request-specific responses, but they must not re-interpret content or depend on local files that do not exist in the runtime. "The build is the source of truth" does not mean "there is no server".

### Small Core, Explicit Contracts

Core owns shared, framework-independent contracts and orchestration. Plugins own reusable content behavior. Themes own appearance. Integrations connect Core to a web framework and bundler. Applications own routes, components, and islands.

In practice:

- Dependencies point inward. Core does not depend on HonoX, Vite, a specific plugin, a theme, or a site application.
- A contract belongs in Core when more than one outer layer needs it and it does not name a framework. A feature that only one plugin needs belongs in that plugin.
- Use the smallest extension point that solves the problem: a manifest or graph query before a filesystem rescan, a Page Type before a custom route, build-time rendering before client JavaScript.
- Official plugins and themes are expected to use the same public contracts as external packages. They are not a separate privileged layer.

The boundary: "small" describes responsibility, not line count. Core contains substantial build-time contracts such as publication, migration, and provenance because those concerns cross package boundaries. Core is framework-independent, but it is not runtime-neutral today: build-time modules use Node APIs, and runtime code must not depend on them.

### Correctness before Optimization

A correct full build is the baseline. Caches, incremental builds, and output reuse are optimizations that must preserve the same published site.

In practice:

- Missing, incompatible, malformed, or uncertain state causes a safe fallback to full work. `--full` is always available.
- Build state is written only after a successful build. A failed build keeps the previous valid state.
- Cache keys include the inputs, versions, and contracts that affect the result. Plugins with unknown or unsafe dependencies bypass reuse.
- When it is unclear whether reuse is correct, rebuild. Speed never justifies publishing the wrong page or leaking unpublished content.

The boundary: performance is a measured property, not a promise. Riebeckite does not guarantee a fixed speedup for every site, and it does not currently promise byte-for-byte identical output between every incremental and clean build. That equivalence is a verification target; uncertain reuse must fall back to a full build.

### Security at Trust Boundaries

Riebeckite assumes a trusted site owner, trusted plugins and themes, and trusted local content. It does not assume that external input, third-party content, or browser data is trusted.

In practice:

- Markdown-authored HTML is filtered by Core's allowlist sanitizer before plugin HTML transforms. Scripts, event handlers, and dangerous URLs are removed.
- Plugin-generated HTML is trusted application code. Plugins must escape external text and validate URLs; Core does not sandbox installed plugin code.
- The publication boundary is resolved at build time. Draft, scheduled, public, and unlisted states are explicit. Unlisted content is routable but not discoverable; discovery surfaces use `discoverableEntries` rather than the full manifest.
- Secrets and absolute local paths must not appear in public output, client entries, logs, or provenance.

The boundary: the sanitizer reduces accidental or malicious HTML in Markdown; it is not a content review process. Third-party plugins, themes, and content still require judgment. Endpoints must validate their input and fail closed. Security and publication constraints are not traded for convenience or build speed.

## Trade-offs in Detail

The principles are not a total order. These rules say which side wins by default and what evidence reverses the default. Security and publication boundaries are constraints, not weights: a convenience feature does not get to override them.

### Obsidian compatibility vs. Riebeckite extensions

**Opposing demands.** Notes should render as they do in Obsidian, but a published site needs behavior that Obsidian has no syntax for.

**Default.** Preserve the meaning of Markdown and Obsidian syntax. Add Riebeckite extensions as explicit, optional, documented behavior, usually in a plugin. Do not silently reinterpret existing syntax.

**Reverse when.** A site-specific need, such as stable section navigation or a custom page shape, has no standard equivalent. Add a documented extension, keep the content readable in Obsidian, and state the compatibility limit.

**Evidence required.** Compatibility tests or a verified matrix, documentation of the extension, an opt-in switch where possible, and a fallback for content that does not use the extension.

**Example.** Sidebar frontmatter is a Riebeckite extension for site navigation. Shortcodes are an opt-in syntax plugin built on `remark-directive`. Neither replaces Markdown.

### Config simplicity vs. customization

**Opposing demands.** A small configuration is easy to understand, but every site has a different shape.

**Default.** Keep the typed configuration small and use presets and conventions. Put customization in a plugin, theme, or application code rather than adding another Core field.

**Reverse when.** Many sites need the same behavior, or a contract requires a shared setting. Add a typed option with validation, a documented default, and a migration path. Do not add a generic escape hatch that moves the complexity elsewhere.

**Evidence required.** Multiple real use cases, a default that preserves existing behavior, tests for invalid values, and documentation of when to use the option.

**Example.** Theme settings belong to the theme package; they should not grow Core's `ThemeOptions`. Plugin options belong to the plugin that uses them.

### Static generation vs. runtime interactivity

**Opposing demands.** Static output is fast, portable, and easy to inspect, but some features need input or computation that is not known at build time.

**Default.** Precompute at build time. Add browser code only when interaction or request-time input is essential, and scope it to the pages that need it. Provide a static fallback where the feature has meaningful content without JavaScript.

**Reverse when.** The feature cannot work without request-time computation or user input, such as a search query, an endpoint, or an interactive widget. Then use a client entry, an endpoint, or the Interactive Runtime with an explicit trust boundary.

**Evidence required.** A no-JavaScript fallback or a clear statement that none is possible, page-scoped loading, runtime limits, and tests for failure and disposal.

**Example.** Search uses a client entry. SPA navigation is optional. The Interactive Runtime loads only on pages with a plugin marker, and a failed runtime leaves the server-rendered fallback in place.

### Performance vs. correctness and reproducibility

**Opposing demands.** Faster builds make large sites pleasant to edit, but reuse can publish stale or incorrect output.

**Default.** Correctness and reproducibility win. Caches are optional, dependency-tracked, and safe to delete. If reuse cannot be justified, do the work again.

**Reverse when.** An optimization has explicit dependency tracking, invalidation tests, and a measured benefit under stated conditions. Even then, it must not weaken publication or security boundaries.

**Evidence required.** A cold-build comparison, tests for missing and corrupt state, the cache-key inputs, and benchmark conditions. "It feels faster" is not evidence.

**Example.** The content cache bypasses plugins with unsafe dependencies. Incremental state is updated only after success. The output-level SSG cache reuses routes only when their dependencies are known.

### Extensibility vs. Core simplicity

**Opposing demands.** More extension points make the framework flexible, but every contract in Core adds maintenance and coupling.

**Default.** Try the plugin, theme, integration, or application first. Add a Core contract only when multiple outer layers need the same framework-independent invariant. Use the smallest extension point.

**Reverse when.** An official feature exposes a missing shared contract, or duplication across packages causes inconsistent behavior. Add the contract, migrate official code to it, and verify that an external package can use it without monorepo access.

**Evidence required.** At least two real consumers, a public API shape that does not name a framework, no reverse dependency, and tests or documentation for external use.

**Example.** A Page Type is preferred over a custom route. Derived Views share computed build-time values without becoming Markdown sources or graph nodes. Theme tokens let a theme change appearance without changing behavior.

### Automation vs. explicitness

**Opposing demands.** Automation removes repetitive work, but destructive or high-impact actions need a clear decision point.

**Default.** Make destructive or high-impact actions staged and explicit: publishing, migration, content mutation, and deletion. Automate safe, reversible, observable work such as caching, building, and diagnostics.

**Reverse when.** Manual work does not scale, and the automation has a dry run, a journal or audit trail, a rollback path, and verification. The action can still be inspected before it takes effect.

**Evidence required.** A plan or dry-run output, idempotency and recovery tests, a record of what changed, and a way to stop before the irreversible step.

**Example.** Content mutation plans before writing and keeps a journal. Content migration is explicit about its rules. Publication approval is opt-in. Incremental caching happens automatically because it is safe to discard.

### User freedom vs. safety

**Opposing demands.** A framework should let people build what they want, but some choices can publish private content or expose a site to attack.

**Default.** Preserve freedom in content structure, routes, presentation, and deployment. Enforce safety at trust boundaries: sanitization, publication state, endpoint validation, and secret handling.

**Reverse when.** The user explicitly opts into a trusted extension point with documented consequences, such as plugin-generated HTML or an external embed provider. The opt-in must be visible; it must not silently widen the trust boundary for everyone.

**Evidence required.** A threat model, sanitizer and publication-boundary tests, and documentation of what the opt-in trusts.

**Example.** Markdown raw HTML is sanitized. Plugin-generated HTML is trusted because the plugin is trusted code. Unlisted content stays out of discovery surfaces. Publication boundaries and secret handling are never traded for convenience.

### Existing API preservation vs. architecture improvement

**Opposing demands.** Users need stable APIs, but a wrong boundary becomes more expensive to keep than to fix.

**Default.** Preserve public APIs and provide a migration path. Before 1.0, minor releases may contain breaking changes; from 1.0 onward, Riebeckite follows semantic versioning. Communicate changes in release notes and migration guides.

**Reverse when.** A boundary is wrong or unsafe, and preserving it would perpetuate the defect. Make the change with a documented migration, an explanation of the new boundary, and tests for the migration path.

**Evidence required.** The affected public surface, migration steps, release notes, and a test that the old behavior is either supported or clearly rejected.

**Example.** Package boundaries and public exports are part of the contract; `@riebeckite/core/src/**` is internal. Riebeckite does not currently provide runtime deprecation warnings or compatibility shims by default, so an upgrade can require code changes.

## Non-goals in Detail

The summary lists the settled non-goals and architectural constraints. This section records the limits that are not settled policy.

### Currently unsupported, not settled non-goals

These are limits of the current implementation. They may change if the need and design are strong enough:

- DataviewJS. The Dataview plugin supports DQL queries, not JavaScript execution.
- Obsidian community plugins. Riebeckite reads notes; it does not run the Obsidian plugin runtime.
- Arbitrary template engines such as Liquid, Nunjucks, or EJS. Sites use TypeScript, JSX, and HonoX rather than a separate templating language.
- Rewriting arbitrary Markdown body text in content migration. Migration rules operate on parsed frontmatter and logical paths, not regex find-and-replace over the body.

### Possible future work, not commitments

More runtime adapters, more deployment guides, and a deprecation period before breaking changes are plausible. They are not promises, and this page does not treat them as settled policy.

### Proposed, not policy

The following are sometimes suggested as non-goals but are not settled: "not a CMS", "not a no-code site builder", and "not a community or comments platform". They require a maintainer decision with evidence. They are recorded here as open questions, not as official policy.

## Recording a Deviation

Important decisions are recorded as Architecture Decision Records under [`docs/agents/adr/`](../agents/adr/README.md). Write one for a public contract change, an architecture boundary change, an intentional exception to a principle, a security or publication exception, or a release policy change. For most other changes, the pull request or issue is enough: state the problem, the decision, the alternatives, and the consequence. Do not require an ADR for every small change.

User-facing changes are recorded separately as change entries under `changes/unreleased/`. The entries are validated before a release and generate the changelog, the [release notes](./releases.md), and GitHub Releases from one source. See [Release Operations](./framework/release.md) for the workflow.

A deviation is not a failure. An unrecorded deviation is. Security and publication exceptions need explicit approval and tests; they are not ordinary trade-offs.
