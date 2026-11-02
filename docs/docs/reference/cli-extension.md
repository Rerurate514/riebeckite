---
date: 2026-11-01
title: CLI Extension API
---
# CLI Extension API

Riebeckite resolves and runs every command through one command registry. Built-in commands and Plugin commands use the same definition API, parser, execution context, help renderer, JSON contract, and shell completion generator. The old central dispatcher and the separate interactive command parser are gone.

The registry types live in `@riebeckite/core` and do not depend on Node.js. Process I/O, project loading, and signal handling belong to `@riebeckite/cli`.

## Define a command

`defineCliCommand` returns a `CliCommandDefinition`. The `id` is the full command path, with spaces between levels.

```ts
import {
  cliArgument,
  cliBoolean,
  cliEnum,
  cliString,
  defineCliCommand,
} from "@riebeckite/core";

export const readingTime = defineCliCommand({
  id: "reading-time",
  summary: "Estimate reading time for a path.",
  description: "Reads a content path and prints the estimated reading time.",
  arguments: [
    cliArgument("path", {
      description: "Content path.",
      required: true,
    }),
  ],
  options: [
    cliEnum("format", ["text", "json"], {
      description: "Output format.",
      default: "text",
    }),
    cliString("label", {
      description: "Label for the result.",
      default: "Reading time",
    }),
    cliBoolean("verbose", {
      description: "Print details.",
      short: "v",
    }),
  ],
  examples: [
    { command: "riebeckite reading-time notes/post.md" },
  ],
  requiresProject: true,
  supportsJson: true,
  async handler(context, input) {
    const project = await context.loadProject();
    const path = input.arguments.path;
    const result = { path, minutes: 1 };

    if (input.options.format === "json" || context.json) {
      context.output.json(result);
      return;
    }
    context.output.writeLine(
      `${input.options.label}: ${result.minutes} min${input.options.verbose ? ` (${project.projectRoot})` : ""}`,
    );
  },
});
```

`defineCliCommand` is an authored-time helper: it preserves option and argument types for the handler. Handlers run only after resolution and validation succeed.

## Command shape

| Field | Purpose |
| --- | --- |
| `id` | Canonical command path, such as `publish plan` or `acme greet`. |
| `summary` | One line for command lists. |
| `description` | Longer help text. |
| `arguments` | Ordered positional arguments. |
| `options` | Named flags and values. |
| `examples` | Help examples. |
| `requiresProject` | Load `riebeckite.config.ts` before the handler runs. |
| `raw` | Pass remaining tokens to the handler without parsing. |
| `aliases` | Alternative command paths. |
| `hidden` | Keep the command out of command lists. |
| `supportsJson` | Accept `--json` and expose `context.json`. |
| `validate` | Command-level cross-field validation. |
| `handler` | Command implementation. |

Command names use lowercase kebab-case. Nested commands form a tree. A command may also act as a group, so `create` can run interactively and still own `create site`.

## Arguments and options

| Builder | Value |
| --- | --- |
| `cliBoolean(name, options)` | Boolean flag. Set `negatable` to accept `--no-name`. |
| `cliString(name, options)` | String value. |
| `cliStringWithDefault(name, value, options)` | String value with a default. |
| `cliNumber(name, options)` | Number value. Use `integer`, `min`, and `max` for validation. |
| `cliEnum(name, values, options)` | One value from a fixed list. |
| `cliArgument(name, options)` | Positional argument. |
| `cliVariadicArgument(name, options)` | One or more positional values. |
| `cliExample(command, description?)` | Help example. |

Options support long names, short flags, `--name=value`, repeatable values, required values, hidden metadata, defaults, and a `validate` callback. Arguments support required, variadic, enum, default, hidden, and validation metadata.

The parser handles `--`, quoted arguments already split by the shell, clustered boolean short flags, and `--no-*` negation. It rejects unknown options, missing values, duplicate non-repeatable options (except repeatable flags), missing required arguments, extra positional arguments, and invalid enum or number values.

## Command context

The handler receives `CliCommandContext` and `CliCommandInput`.

`context` provides:

- `cwd`, `projectRoot`, `project`, and `config`
- the loaded project via `loadProject()`
- `logger` for human-readable progress
- `output.write`, `output.writeLine`, `output.error`, and `output.json`
- reported diagnostics
- an `AbortSignal`
- environment information
- the active command registry
- `onCleanup()` for resources

The CLI loads the project only when a command requires it. Commands that only print help, generate completion, or validate arguments do not initialize Vite, HonoX, the Plugin runtime, or project configuration.

`output.json` writes to stdout. In JSON mode, logger messages and warnings go to stderr so stdout stays valid JSON. Cleanup callbacks run in reverse order, including when a handler throws.

## Plugin commands

A Plugin declares CLI commands through the existing `definePlugin` object. There is no second Plugin discovery mechanism.

```ts
import { cliArgument, defineCliCommand, definePlugin } from "@riebeckite/core";

export const acme = definePlugin({
  name: "acme",
  cli: {
    namespace: "acme",
    commands: [
      defineCliCommand({
        id: "greet",
        summary: "Greet someone.",
        arguments: [
          cliArgument("name", { description: "Person to greet.", required: true }),
        ],
        supportsJson: true,
        handler(context, input) {
          const message = `Hello, ${input.arguments.name}!`;
          if (context.json) context.output.json({ message });
          else context.output.writeLine(message);
        },
      }),
    ],
  },
});
```

Add the Plugin to `riebeckite.config.ts` as usual. Only enabled Plugins listed in configuration register commands. A disabled Plugin contributes no commands and is not loaded for help or completion.

The namespace defaults to the Plugin name. Command IDs are prefixed with the namespace: a command with `id: "greet"` in namespace `acme` becomes `acme greet`. The registry rejects duplicate command IDs, alias collisions, conflicting namespaces, and namespaces that collide with built-in command paths.

Plugin registration failures are isolated. One broken Plugin does not prevent other Plugins or built-in commands from running. The CLI reports the Plugin and the reason on stderr.

## Help and completion

`riebeckite --help`, `riebeckite help <command>`, `riebeckite <command> --help`, and `riebeckite completion <shell>` read registry metadata. They do not call command handlers.

- Root help and built-in command help do not load the project.
- `help <plugin-command>` and `completion <shell> --project` load configuration and enabled Plugin commands.
- Bash, Zsh, and PowerShell completion include commands, subcommands, options, enums, and Plugin commands.
- Generated scripts escape command names and descriptions before embedding them in shell code.

The help renderer wraps text to the terminal width and can emit ANSI styling when the terminal supports it. CI and non-TTY output stays plain.

## JSON and errors

A command that declares `supportsJson: true` accepts `--json` even if it does not declare a `json` option. The handler can inspect `context.json` and write through `context.output.json`.

Successful command output is command-specific. The CLI does not force every command into one schema. Failures use a shared envelope:

```json
{
  "ok": false,
  "error": {
    "code": "CLI_USAGE",
    "message": "Unknown option: --wat.",
    "command": "acme greet",
    "exitCode": 2
  }
}
```

In JSON mode the error envelope goes to stderr, never mixed into stdout. Exit codes are stable:

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Command failure |
| `2` | CLI usage or validation error |
| `130` | Aborted by the user |

## Security and trust

The trust boundary is explicit configuration. The CLI registers commands from Plugins that appear in the resolved `plugins` array, and the existing loader already removes `enabled: false` entries. The CLI does not scan untrusted Markdown, Frontmatter, content directories, or arbitrary files for executable commands.

Plugin command IDs and namespaces must not shadow built-in commands. Help and completion never execute a Plugin handler merely to discover metadata. Plugin authors must not put secrets in summaries, descriptions, examples, or JSON output. The CLI does not automatically print option values.

## Performance

The CLI bundle uses code splitting. The entry chunk contains command definitions and the parser; project loading, Vite, HonoX, and command handlers live in separate chunks. On Windows, measured entry points were:

```text
riebeckite --help        ~110 ms
riebeckite --version     ~100 ms
riebeckite help build    ~80 ms
riebeckite buidl          ~90 ms (suggestion, no project load)
riebeckite acme greet     project discovery, then Plugin command
```

A typo with a built-in suggestion does not load the project. Unknown commands without a built-in suggestion attempt Plugin discovery so Plugin commands remain reachable.

## Migration guide for Plugin authors

Before this change, a Plugin could not contribute a CLI command, and a dispatcher change was required for each new built-in command. To migrate an external command:

1. Keep the command implementation in a module that exports a function.
2. Add a `cli` object to the Plugin definition.
3. Define each command with `defineCliCommand` and a namespace.
4. Move argument and option declarations into the definition instead of parsing `process.argv` inside the handler.
5. Read values from `input.arguments` and `input.options`; read project data from `context.loadProject()` only when the command needs it.
6. Return `false`, throw `CliCommandError`, or throw `CliUsageError` instead of setting `process.exitCode` directly.
7. Use `context.output` and `context.logger` so JSON mode keeps stdout clean.
8. Add tests that run `runCli` with a real configuration and Plugin fixture, including disabled Plugin, duplicate command, unknown option, and failure cases.

The internal `parseCommand`, `Command` union, and central dispatcher APIs were removed. They are not compatibility shims. Code that imported them must move to `defineCliCommand`, `createCliCommandRegistry`, `registerCliCommand`, or `registerPluginCliExtension`.

## Limitations

- Commands are trusted project code. The registry does not sandbox a handler.
- Only enabled Plugins in the resolved configuration contribute commands.
  Riebeckite never scans content, Markdown, or arbitrary directories for
  executable commands.
- A `raw` command such as `content` performs its own argument parsing, so its
  inner flags are not validated by the shared parser or shown in completion.
- Completion is generated from definition metadata. It cannot complete dynamic
  values such as filesystem paths or provider state.
- Help and completion never execute a handler, so they cannot validate that a
  referenced external tool is installed.
- The JSON envelope covers failures. Successful command output remains
  command-specific and is not normalized by the CLI.

## Troubleshooting

- **"Unknown command"**: check the canonical path with
  `riebeckite help <command>`; Plugin commands need an enabled Plugin and the
  `--project` flag for completion.
- **A Plugin command is missing**: confirm the Plugin is in the resolved
  `plugins` array and is not `enabled: false`. Registration failures are reported
  on stderr without stopping other commands.
- **"command ... conflicts"**: choose a namespace and command ID that do not
  shadow a built-in path or another Plugin.
- **stdout is not valid JSON**: use `context.output.json` and `context.logger`.
  Logger output and warnings go to stderr in JSON mode.
- **`--json` is rejected**: declare `supportsJson: true` and either declare a
  `json` option or rely on the built-in acceptance.
- **A handler did not run**: argument, option, and command-level validation run
  first. A usage error exits with code 2 before the handler is called.

## See also

- [CLI](./cli.md)
- [Plugin API](./plugin-api.md)
- [Plugin System](../framework/plugin-system.md)
- [Security](../security.md)
