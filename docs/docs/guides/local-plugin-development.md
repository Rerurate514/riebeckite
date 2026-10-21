---
title: Local Plugin Development
---
# Local Plugin Development

Use `riebeckite plugin dev` to run a local Plugin package through a temporary Riebeckite site. The preview uses the real PluginRuntime, HonoX, and Vite, so it exercises the same Markdown pipeline, CSS assets, and client entry that a site uses.

[日本語](./local-plugin-development.ja.md)

## When to use it

Choose this command when you are changing a Plugin's transform, styles, or client behavior and want to see the result in a browser. It is different from the public [Playground](/playground) and from [Plugin previews](./plugin-previews.md):

- The Playground loads only Plugins registered by the host and does not run Plugin client entries.
- `plugin dev` loads one Plugin from a local path and executes its client entry.
- `theme preview` checks a Theme with fixed content fixtures. `plugin dev` checks a Plugin with its own temporary site.

## Start a preview

Run the command from the Plugin package or pass a path:

```sh
riebeckite plugin dev ./extensions/my-plugin
riebeckite plugin dev ../my-plugin --port 4321 --no-open
```

| Option | Meaning |
| --- | --- |
| `<path>` | Plugin directory or its `package.json` |
| `--port <port>` | Port for the development server |
| `--no-open` | Do not open a browser automatically |

The Plugin directory must contain a valid `package.json`. The entry point is resolved from `exports["."]` (`source`, `import`, `module`, or `default`), then `main`, then a conventional `index.ts`. Export subpaths such as `./client` and `./style.css` are mapped to the local files when they exist.

Install the Plugin's dependencies in its own project before starting the preview. The command never installs packages automatically.

## Fixture site

The command creates a minimal HonoX site in the system temporary directory, links the local Plugin into it, and prints the fixture path. The fixture contains deterministic Markdown with a heading and tabbed code blocks. It does not read or change your Vault, `riebeckite.config.ts`, or build output.

The generated site uses the default Theme and the standard Riebeckite Plugins for Markdown, color mode, and table of contents, followed by the local Plugin. This keeps the preview close to a normal site without copying your project configuration.

## Updates while editing

| Change | Result |
| --- | --- |
| Plugin CSS | Vite HMR updates the open page |
| Plugin client entry | The preview reloads and runs the new client code |
| Fixture Markdown | The rendered page updates |
| Plugin entry point | The development server restarts |

If a change cannot be applied, the terminal reports the error instead of claiming success. Compilation and initialization failures exit with a non-zero status.

## Errors and cleanup

A missing path, invalid `package.json`, unsupported entry point, or Plugin initialization error is reported before the preview is usable. The temporary site is removed on Ctrl+C, normal shutdown, or startup failure. If the process is killed forcibly, delete the fixture path printed at startup.

## Security

`plugin dev` is a trusted local development command. It executes the Plugin entry and client code from the given path. Only run Plugins you trust, and do not expose the preview server to untrusted users. The public Playground API does not load local Plugins.

## Troubleshooting

- `Could not find a plugin`: check the path. Relative paths resolve from the current directory.
- `Could not find package.json`: point at the package root or its `package.json`.
- `Could not find the plugin entry point`: add `exports["."]`, `main`, or `index.ts`.
- Vite reports a compile error: install the Plugin's dependencies and read the terminal output.
- The port is already in use: pass another `--port`.
