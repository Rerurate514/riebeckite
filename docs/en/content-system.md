# Content System

## Two explicit responsibilities

`ContentSource` is the boundary for finding and reading source data. It owns scanning, reading, identity, and source metadata such as mtime, size, ETag, or hashes. `FileSystemContentSource` is the normal local implementation.

`ContentManager` owns the meaning of that data: parsing, Markdown/HTML pipeline execution, post processing, plugin orchestration, manifest creation, and content-graph construction. It should not grow direct filesystem behavior that bypasses `ContentSource`.

## Processing model

```text
scan/read source -> parse post -> process post -> create manifest -> graph
                       |              |
                       `--- plugin lifecycle/content hooks ---'
```

Plugin hooks observe or extend defined phases such as configuration resolution, content loaded, parsed/processed posts, manifest creation, and build start/end. Keep source I/O, semantic interpretation, and rendering distinct so a remote source can replace the filesystem source without changing Core policy.

## Manifest, graph, and runtime

The manifest is the generated content representation used by the application. The content graph represents relationships and can be extended through the plugin graph contract. Reading a runtime manifest is not an explicit build. Incremental build state belongs only to the explicit build path and is never a mutable Worker runtime dependency.

## Correctness rules

- Preserve canonical content identity across source, manifest, and graph.
- Treat source metadata as change evidence, not universally reliable truth.
- Make publication/exclusion policy visible in configuration.
- Return diagnostics for recoverable user-facing problems; do not silently omit content.
- Keep graph extensions deterministic for identical inputs.

See [Configuration](configuration.md), [Build system](build-system.md), and [Plugin system](plugin-system.md).
