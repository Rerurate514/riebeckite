# Riebeckite Architecture Boundaries

Riebeckite separates code by reason to change.

## Core

`packages/core` owns the content repository, content manager, manifest, content
graph, pipeline, plugin runtime, config, and shared domain types. Core must not
know about individual plugins or site features such as Mermaid, search, or
backlinks.

Change Core only when the existing plugin extension points or content model
cannot express a reusable capability needed by multiple plugins or features. Do
not add plugin-specific APIs to Core.

## Plugin

`packages/plugins/*` extends how content is interpreted or transformed: Markdown,
AST, HTML, metadata, assets, and client behavior. Mermaid, Media, Excalidraw,
Lightbox, and Obsidian Markdown are plugins.

Keep plugin-specific CSS and client initializers inside the plugin package when
possible, and expose them through `assets` and `clientEntries`. Avoid spreading a
single plugin across `apps/web` files.

## Feature

`apps/web/app/features` represents what the site can do. Backlinks, Recent
Posts, Search Bar, and Table of Contents can own UI, queries, server-side data
preparation, client behavior, and feature-specific CSS.

Features use Core and the content model to prepare data, then pass it to
components. Keep feature-specific server/client/style files in the same feature
directory.

## Component

`apps/web/app/components` is the presentation layer. Components should not read
from the filesystem or ContentManager directly; they receive data or slots via
props and render them.

For example, `Article` owns the article display shell and frontmatter rendering,
while Backlinks and Table of Contents data preparation belong to features.

## Infrastructure

HonoX routes, Vite config, Cloudflare Workers, filesystem access, and build
scripts connect Riebeckite to external technology. Keep the existing structure
unless a dedicated infrastructure directory adds real clarity.

## Decision guide

- Add Markdown / HTML interpretation or transformation capability as a Plugin.
- Add site behavior, queries, server/client behavior, or screen capability as a Feature.
- Render provided data as a Component.
- Change Core for content model, pipeline, plugin runtime, manifest, or shared foundations.
- Treat bundler, routing, filesystem, and deployment integration as Infrastructure.
