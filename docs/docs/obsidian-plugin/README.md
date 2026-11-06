---
date: 2026-11-04
title: Riebeckite for Obsidian
sidebar:
  label: Obsidian Plugin
  order: 25
publish: false
---
# Riebeckite for Obsidian

Riebeckite for Obsidian is the Obsidian plugin that will connect a vault to a
local Riebeckite development server. The current implementation is a foundation:
it adds a settings tab and an **Open settings** command. It does not connect to a
server, publish notes, or change vault data.

The plugin lives in its own repository,
[Rerurate514/riebeckite-obsidian](https://github.com/Rerurate514/riebeckite-obsidian).
It is not part of the Riebeckite monorepo and does not depend on it at runtime.

## Status

| Area | Current behavior |
| --- | --- |
| Settings | Saves one local server URL |
| Commands | `Riebeckite: Open settings` |
| Server connection | Not implemented |
| Note publishing | Not implemented |
| Vault changes | Never performed |

The plugin is not listed in the Obsidian Community Plugins directory, and no npm
package is published. Install it manually from a local build.

## Requirements

- Obsidian 1.0.0 or later (`minAppVersion` in `manifest.json`)
- Node.js 24.22.0 and Corepack to build from source
- pnpm 11.5.3, pinned by `packageManager`

`isDesktopOnly` is `false`. The plugin uses no Electron, Node, or desktop-only
API, so Obsidian can load it on mobile. Change the value to `true` before adding
a desktop-only dependency.

## Install manually

1. Clone the plugin repository and build it.

   ```sh
   git clone https://github.com/Rerurate514/riebeckite-obsidian.git
   cd riebeckite-obsidian
   corepack enable
   pnpm install --frozen-lockfile
   pnpm build
   ```

2. Create the plugin folder in your vault.

   ```text
   <vault>/.obsidian/plugins/riebeckite/
   ```

3. Copy `main.js` and `manifest.json` into that folder.
4. In Obsidian, open **Settings → Community plugins**, reload the list if
   needed, and enable **Riebeckite**.

`pnpm build` writes a production `main.js` and runs the manifest check. These
two files are all the plugin needs at runtime.

## Loading behavior

When Obsidian enables the plugin, `onload` runs these steps in order:

1. Reads saved data and validates it with `parseSettings`.
2. Registers the **Riebeckite** settings tab.
3. Registers the **Riebeckite: Open settings** command.

If a step throws, the plugin writes the error to the developer console and shows
the notice "Riebeckite could not be loaded. Check the console for details." The
remaining registration steps do not run.

## Settings

| Setting | Default | Behavior |
| --- | --- | --- |
| Local server URL | `http://127.0.0.1:3000` | Saved when the field changes |

The settings tab states that local development server integration is not
connected. The URL is configuration for a future connection; the plugin makes
no request with it.

Saved data is treated as untrusted input. `parseSettings` accepts a value only
when it is an object with a string `serverUrl` that parses as an `http:` or
`https:` URL. It removes one trailing slash and otherwise returns the default
settings, so an invalid value that reaches `updateSettings` is stored as the
default.

If saving fails, the plugin logs the error, shows "Riebeckite settings could not
be saved.", and restores the previous value in the field.

On load, invalid saved data becomes the default in memory. The plugin does not
rewrite the settings file until the next save.

## What it does not do

- Start, stop, or call a Riebeckite development server.
- Publish, move, rename, or delete notes.
- Read frontmatter or decide which notes are public.
- Replace `publish: true`, `content.directory`, or the build.

Publishing still runs through the Riebeckite CLI. See
[Publishing Obsidian notes](../guides/obsidian.md).

## Repository layout

| Path | Responsibility |
| --- | --- |
| `src/main.ts` | Plugin entry point, command, and settings loading |
| `src/settings/` | Settings model, validation, and settings tab |
| `src/lifecycle/` | Disposal of resources outside Obsidian's lifecycle |
| `scripts/` | Build, version synchronization, and release checks |
| `test/` | Tests for settings, disposal, and release files |

See [Plugin architecture](./architecture.md) for the implementation details and
the boundary planned for the server connection.

## Next

- [Plugin architecture](./architecture.md)
- [Publishing Obsidian notes](../guides/obsidian.md)
- [Plugin repository](https://github.com/Rerurate514/riebeckite-obsidian)
