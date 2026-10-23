---
date: 2026-10-23
title: Diagram Plugin Infrastructure
sidebar:
  label: Diagram infrastructure
---

# Diagram Plugin Infrastructure

`@riebeckite/diagram` is the shared implementation layer for diagram plugins. It keeps repeated diagram-plugin work in one place: locating fenced code blocks in HAST, resolving captions, reporting diagnostics, producing accessible figure markup, and mounting browser renderers.

This package is for plugin authors. It does not add a site feature by itself, and it is not a replacement for [Core's plugin contract](./plugin-system.md).

## Boundaries

The package depends on `@riebeckite/core`, but not on HonoX, a browser renderer, Puppeteer, or a diagram engine. A diagram plugin continues to own its engine, configuration, styles, and failure policy.

`defineDiagramPlugin()` connects the common plugin shape to Core:

- plugin name, order, options, and option validation
- `processedContentCache`
- a rehype transformer
- an optional stylesheet and page-scoped client entry

It deliberately does not choose a rendering engine or move Core's cache policy into this package.

## Build a diagram plugin

Use `defineDiagramPlugin()` when the plugin has the standard diagram-plugin shape. Supply a `processedContentCache` policy from Core and a rehype factory that receives the resolved options.

```ts
import { defineDiagramPlugin } from "@riebeckite/diagram";
import rehypeExampleDiagram from "./rehype.js";

export function exampleDiagram() {
  return defineDiagramPlugin({
    name: "example-diagram",
    processedContentCache: {
      version: "example-v1",
      dependencyMode: "none",
    },
    rehype: () => rehypeExampleDiagram,
    style: ".rb-example-diagram { display: block; }",
    client: {
      moduleSpecifier: "@riebeckite/plugin-example-diagram/client",
      exportName: "initExampleDiagram",
    },
  });
}
```

Keep engine-specific setup outside the factory. For example, a build renderer may need its own browser process or WASM resource, while a browser renderer may need a dynamically imported library.

## Transform fenced blocks into figures

`findDiagramBlocks()` identifies matching `pre > code` blocks and returns the source, language, parent, and index needed to replace the original node. `resolveDiagramCaption()` resolves a title from the code block before trying plugin-specific caption strategies. `reportDiagramDiagnostic()` records an invalid source through the content-processing diagnostic path.

`buildDiagramFigure()` emits the shared figure contract:

- `data-diagram` identifies the diagram kind.
- `data-diagram-status` is `pending`, `rendered`, or `error`.
- `data-diagram-id` is a stable figure identifier. Use `deterministicDiagramId()` when the ID can be derived from kind and source.
- `data-diagram-content` marks the canvas, image, or SVG container.
- `data-diagram-caption` and `data-diagram-fallback` mark optional caption and source fallback elements.

The helper places a caption before content and connects it with accessible labeling. Set `fallback: true` when the source should remain available after rendering fails.

```ts
const figure = buildDiagramFigure({
  kind: "example",
  className: "rb-example-diagram",
  id: deterministicDiagramId("example", block.source),
  source: block.source,
  caption: resolveDiagramCaption(block),
  label: "Example diagram",
  content: { kind: "canvas" },
  fallback: true,
  status: "pending",
});
```

The package provides HAST construction and traversal helpers as well. Use these helpers only for the diagram transformation; plugins should retain their own syntax parsing and semantic validation.

## Browser rendering and SPA navigation

Use `renderPendingDiagrams()` in a page client initializer. It scopes work to the supplied root, respects its abort signal, marks successful figures as `rendered`, and opens the fallback on failure. A renderer may return a cleanup function; the initializer returns the combined cleanup.

```ts
import { renderPendingDiagrams } from "@riebeckite/diagram/client";

export async function initExampleDiagram({ root, signal }) {
  return renderPendingDiagrams(
    "example",
    async (figure) => {
      const canvas = figure.querySelector("canvas[data-diagram-content]");
      if (!canvas) return;
      const instance = renderExample(canvas);
      return () => instance.destroy();
    },
    { root, signal },
  );
}
```

This helper does not create another SPA lifecycle. Core's `ClientLifecycle` owns mounting and disposal for page client entries; see [SPA Runtime Internals](./spa-runtime.md) for the surrounding transaction and cancellation model.

`detectDiagramTheme()` returns the current `light` or `dark` preference when a browser renderer needs to select engine-specific colors.

## Build-time renderer resources

For engines that render during the build, `createRenderSession()` serializes render work and manages an optional lazily loaded resource. It passes an abort signal to the renderer, classifies invalid input, renderer errors, timeouts, and cancellation, and disposes the resource when the session is disposed.

The session is a utility, not a required engine policy. Keep resource launch, retry limits, timeouts, and cleanup aligned with the renderer that owns them.

## Adoption status

The package is intentionally adoptable one concern at a time. Shared HAST helpers are used by the diagram-plugin set, while the common figure and browser-rendering contract is currently used by the Chart.js plugin. Other diagram plugins may retain their existing markup and renderer lifecycle until they are migrated.

When changing a diagram plugin, preserve its existing content-cache and incremental-build behavior, then add focused tests for its transformation and client cleanup. For general pipeline composition, see [Content processing and extension points](./plugin-system/pipeline.md).
