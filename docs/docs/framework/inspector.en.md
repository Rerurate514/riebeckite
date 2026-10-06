# Inspector

Inspector answers questions about already-resolved state. Use it through the CLI:

```sh
riebeckite inspect config
riebeckite inspect plugins
riebeckite inspect content --list
riebeckite inspect graph
riebeckite inspect build
```

## Read-only guarantee

Inspection is factual and non-mutating. It must not run a build, write incremental state or plugin cache, emit assets, render special artifacts merely for display, invoke Vite/HonoX build work, or auto-fix configuration. If the requested information does not exist because no build has completed, report that condition plainly.

`inspect content --list` reports each entry's resolved canonical permalink. When a public-location plugin records identity metadata, it also shows the ID and the ID source.

`inspect build` reports the incremental state status. When the state is invalid, it also reports the reason: malformed JSON, an unsupported state version, or an unrecognized structure.

## When to use each tool

- Use **Inspector** to understand resolved configuration, enabled plugins, content, relationships, or existing build state.
- Use **check** to validate configuration and plugin resolution.
- Use **doctor** to diagnose environment and health.
- Use **build** to intentionally create or update build output.

Separating these commands makes automated tooling safe: a CI diagnostic command cannot accidentally modify cache or deployment output. See [CLI](../reference/cli.en.md) and [Diagnostics](diagnostics.en.md).
