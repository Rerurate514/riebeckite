---
date: 2026-11-02
title: Design Philosophy
sidebar.label: Design Philosophy
sidebar.order: 10
---
# Design Philosophy

Riebeckite is a static site framework that turns Markdown and Obsidian notes into a website.

Your notes and your site outlive any single framework. To keep themes from breaking your articles and migrations from forcing rewrites, Riebeckite is built around one core idea: **users should own their content and website, keep the freedom to customize when needed, and never have to deal with unnecessary complexity in everyday use.** What follows is not a feature list but a set of criteria for decisions; where the implementation falls short, that is a bug to fix or a question to settle, not a reason to rewrite the principles.

## Design Principles

### 1. Keep Content and Site Ownership with the User

Your Markdown files and Obsidian vault are always the source of truth. Because Riebeckite never requires rewriting notes into a proprietary dialect, moving to another tool leaves your writing intact. You also own the configuration, the generated application code (`app/`), the build output, and the deployment target, with no lock-in to a particular host.　However, this framework recommends using Cloudflare Workers.

### 2. Simple by Default, Complexity Only When Needed

Advanced flexibility is not an excuse to make everyday publishing complicated. Writing and publishing notes should work with a preset and minimal configuration, without requiring you to learn the internal architecture. Customizing layouts, extending the HonoX application, or writing plugins are things you only touch when you actually need them. Even when defaults and presets automate routine setup, configuration and build output stay traceable and explicit.

### 3. Respect Web Standards and the Existing Ecosystem

Riebeckite does not invent custom specifications where existing technology already solves the problem. It uses unified for Markdown, HonoX for rendering and routing, Vite for bundling, TypeScript, JSX, and CSS for UI, and npm for distribution. Riebeckite-specific APIs are limited to areas that generic tools cannot handle safely, such as Obsidian link resolution, publication boundaries, and plugin coordination.

### 4. Static by Default, Safety Enforced at Build Time

Everything that can be resolved at build time is resolved at build time, producing static HTML that stays readable without JavaScript. Interactive features such as search and graphs are added only to the pages that need them, and the published site never reads build-time caches or local files. Build time is also where Riebeckite sanitizes raw HTML and enforces the publication boundary, so private notes never reach search, RSS, or other derived output.

### 5. Clear Boundaries for Long-Term Maintainability

Core, Plugin, Theme, Integration, and Application have distinct responsibilities, and dependencies always point inward toward Core. Themes own only CSS and visual tokens rather than routes or page structure, so switching themes never breaks your articles or URLs. These boundaries exist not for abstraction's sake, but to keep Core small and the design easy to understand, change, and migrate over time.

## Trade-offs

When values pull in different directions, Riebeckite decides in this order. Overturning a default requires evidence such as measurements, tests, or migration steps.

- Obsidian compatibility comes before custom extensions. Extra syntax ships as plugins within what standard Markdown can still read, so existing notes work as written.
- Correctness and reproducibility come before build speed. If an incremental build is uncertain, Riebeckite falls back to a full build. Security and the publication boundary are constraints that always hold.
- Long-term maintainability comes before pre-1.0 API stability. During `0.x`, design fixes come first, and every breaking change records its migration steps (SemVer applies from 1.0 onward).

## Non-goals

- Riebeckite does not aim to replace Obsidian or web standards. It does not rebuild the editor or hide HonoX, Vite, and CSS behind a custom template language.
- Riebeckite does not run a hosted CMS. It does not lock articles inside a browser admin panel and a database; it is a framework for publishing file-based notes.
- Riebeckite does not put every feature in Core. Search, graphs, OG images, and similar features live in plugins.

## Related Documentation

- Package responsibilities and boundaries: [Architecture](./framework/architecture.md) · [Boundaries](./framework/architecture/boundaries.md)
- Trust model and publication boundary: [Security](./security.md)
- Design decisions and change records: [Workflow](./framework/development/workflow.md)
