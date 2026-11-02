import assert from "node:assert/strict";
import { test } from "node:test";
import type { CliCommandSpec } from "../src/cli/index.js";
import {
  cliArgument,
  cliBoolean,
  cliEnum,
  cliExample,
  cliNumber,
  cliString,
  cliStringWithDefault,
  cliVariadicArgument,
  createCliCommandRegistry,
  defineCliCommand,
  findCommandByPath,
  formatCommandHelp,
  formatRootHelp,
  generateCompletion,
  registerCliCommand,
  registerPluginCliExtension,
  resolveCliCommand,
  suggest,
} from "../src/cli/index.js";

const handler = () => undefined;

function command(
  id: string,
  {
    handler: commandHandler = handler,
    ...options
  }: Partial<CliCommandSpec> = {},
) {
  return { summary: `${id} summary`, ...options, id, handler: commandHandler };
}

test("defineCliCommand preserves authored metadata", () => {
  let received = "";
  const build = defineCliCommand({
    id: "build",
    summary: "Build the site.",
    arguments: [cliArgument("target", { required: true })],
    options: [cliBoolean("full"), cliNumber("jobs", { integer: true })],
    handler: (_context, input) => {
      received = `${input.arguments.target}:${input.options.full}:${input.options.jobs}`;
    },
  });
  assert.equal(build.id, "build");
  assert.equal(build.arguments?.[0]?.required, true);
  assert.equal(received, "");
});

test("registry exposes nested commands and finds them by path", () => {
  const registry = createCliCommandRegistry();
  const next = registerCliCommand(
    registerCliCommand(registry, command("create")),
    command("create site"),
  );
  assert.equal(
    findCommandByPath(next, "create site")?.command.id,
    "create site",
  );
  assert.equal(next.nodes[0]?.name, "create");
  assert.equal(next.nodes[0]?.children[0]?.name, "site");
  assert.equal(next.nodes[0]?.children[0]?.path, "create site");
});

test("registry rejects duplicate ids and aliases", () => {
  const registry = registerCliCommand(
    createCliCommandRegistry(),
    command("build"),
  );
  assert.throws(
    () => registerCliCommand(registry, command("build")),
    /Duplicate command id/,
  );
  assert.throws(
    () => registerCliCommand(registry, command("dev", { aliases: ["build"] })),
    /conflicts with a command id/,
  );
  const withAlias = registerCliCommand(
    createCliCommandRegistry(),
    command("dev", { aliases: ["serve"] }),
  );
  assert.throws(
    () =>
      registerCliCommand(withAlias, command("preview", { aliases: ["serve"] })),
    /alias serve is registered by both/,
  );
});

test("registry rejects invalid names and namespaced collisions", () => {
  assert.throws(
    () => registerCliCommand(createCliCommandRegistry(), command("Build")),
    /lowercase kebab-case/,
  );
  const withBuiltin = registerCliCommand(
    createCliCommandRegistry(),
    command("acme"),
  );
  assert.throws(
    () =>
      registerPluginCliExtension(withBuiltin, "acme", {
        commands: [command("hello")],
      }),
    /namespace acme conflicts with command acme/,
  );
  const withTwoPlugins = registerPluginCliExtension(
    createCliCommandRegistry(),
    "acme",
    { commands: [command("hello")] },
  );
  assert.throws(
    () =>
      registerPluginCliExtension(withTwoPlugins, "other", {
        namespace: "acme",
        commands: [command("world")],
      }),
    /namespace acme is used by both/,
  );
  assert.throws(
    () =>
      registerPluginCliExtension(createCliCommandRegistry(), "acme", {
        commands: [command("hello", { aliases: ["acme alias"] })],
      }),
    /namespace acme conflicts with alias/,
  );
  assert.throws(
    () =>
      registerPluginCliExtension(createCliCommandRegistry(), "acme", {
        commands: [command("hello", { aliases: ["deploy custom"] })],
      }),
    /must be namespaced under acme/,
  );
});

test("plugin extension namespaces resolve and report plugin ownership", () => {
  const registry = registerPluginCliExtension(
    createCliCommandRegistry(),
    "acme",
    {
      commands: [command("hello"), command("hello world")],
    },
  );
  const resolution = resolveCliCommand(registry, ["acme", "hello", "world"]);
  assert.equal(resolution.kind, "command");
  if (resolution.kind === "command") {
    assert.equal(resolution.registration.pluginId, "acme");
    assert.equal(resolution.registration.command.id, "acme hello world");
  }
  assert.equal(findCommandByPath(registry, "acme hello")?.pluginId, "acme");
});

test("resolution handles root help, version, aliases and nested help", () => {
  const registry = registerCliCommand(
    createCliCommandRegistry(),
    command("build"),
  );
  assert.equal(resolveCliCommand(registry, []).kind, "root-help");
  assert.equal(resolveCliCommand(registry, ["--help"]).kind, "root-help");
  assert.equal(resolveCliCommand(registry, ["-v"]).kind, "version");
  assert.equal(resolveCliCommand(registry, ["build", "--help"]).kind, "help");
  const alias = registerCliCommand(
    registry,
    command("dev", { aliases: ["serve"] }),
  );
  assert.equal(resolveCliCommand(alias, ["serve"]).kind, "command");
});

test("option parsing supports types, shorts, defaults, repeats and negation", () => {
  const registry = registerCliCommand(
    createCliCommandRegistry(),
    command("build", {
      arguments: [cliArgument("target", { required: true })],
      options: [
        cliStringWithDefault("output", "dist"),
        cliBoolean("color", { short: "c", negatable: true }),
        cliNumber("port", { short: "p", integer: true, min: 1, max: 65535 }),
        cliEnum("format", ["json", "text"], { default: "text" }),
        cliString("tag", { repeatable: true }),
      ],
    }),
  );
  const resolution = resolveCliCommand(registry, [
    "build",
    "site",
    "-c",
    "--no-color",
    "-p=8080",
    "--format",
    "json",
    "--tag",
    "a",
    "--tag=b",
  ]);
  assert.equal(resolution.kind, "command");
  if (resolution.kind !== "command") return;
  assert.deepEqual(resolution.input.arguments, { target: "site" });
  assert.deepEqual(resolution.input.options, {
    output: "dist",
    color: false,
    port: 8080,
    format: "json",
    tag: ["a", "b"],
  });
});

test("short options reject another option as their value", () => {
  const registry = registerCliCommand(
    createCliCommandRegistry(),
    command("demo", {
      options: [
        cliString("output", { short: "o" }),
        cliNumber("count", { short: "n" }),
        cliBoolean("full", { short: "f" }),
      ],
    }),
  );
  assert.throws(
    () => resolveCliCommand(registry, ["demo", "-o", "--full"]),
    /-o requires a value/,
  );
  const resolution = resolveCliCommand(registry, ["demo", "-n", "-2"]);
  assert.equal(resolution.kind, "command");
  if (resolution.kind !== "command") return;
  assert.equal(resolution.input.options.count, -2);
});

test("double dash stops option parsing", () => {
  const registry = registerCliCommand(
    createCliCommandRegistry(),
    command("run", {
      arguments: [cliVariadicArgument("args")],
      options: [cliBoolean("verbose", { short: "v" })],
    }),
  );
  const resolution = resolveCliCommand(registry, [
    "run",
    "--",
    "--verbose",
    "-v",
  ]);
  assert.equal(resolution.kind, "command");
  if (resolution.kind !== "command") return;
  assert.deepEqual(resolution.input.options.verbose, false);
  assert.deepEqual(resolution.input.arguments.args, ["--verbose", "-v"]);
});

test("raw commands keep their arguments untouched", () => {
  const registry = registerCliCommand(
    createCliCommandRegistry(),
    command("content", { raw: true }),
  );
  const resolution = resolveCliCommand(registry, [
    "content",
    "edit",
    "--apply",
    "--json",
    "--help",
  ]);
  assert.equal(resolution.kind, "command");
  if (resolution.kind !== "command") return;
  assert.deepEqual(resolution.input.rawArguments, [
    "edit",
    "--apply",
    "--json",
    "--help",
  ]);
});

test("raw commands honor leading help without consuming later help", () => {
  const registry = registerCliCommand(
    createCliCommandRegistry(),
    command("content", { raw: true }),
  );
  assert.equal(resolveCliCommand(registry, ["content", "--help"]).kind, "help");
  assert.equal(resolveCliCommand(registry, ["content", "-h"]).kind, "help");
});

test("invalid arguments and options report useful errors", () => {
  const registry = registerCliCommand(
    createCliCommandRegistry(),
    command("deploy", {
      arguments: [
        cliArgument("target", { required: true, values: ["setup", "domain"] }),
      ],
      options: [cliEnum("provider", ["github", "cloudflare"])],
    }),
  );
  assert.throws(
    () => resolveCliCommand(registry, ["deploy"]),
    /Missing required argument/,
  );
  assert.throws(
    () => resolveCliCommand(registry, ["deploy", "nope"]),
    /requires one of: setup, domain/,
  );
  assert.throws(
    () => resolveCliCommand(registry, ["deploy", "setup", "--provider", "wat"]),
    /requires one of: github, cloudflare/,
  );
  assert.throws(
    () => resolveCliCommand(registry, ["deply"]),
    /Unknown command: deply/,
  );
  assert.throws(
    () =>
      resolveCliCommand(registry, ["deploy", "setup", "--providr", "github"]),
    /Unknown option: --providr/,
  );
});

test("suggestions prefer prefixes and close matches", () => {
  assert.equal(suggest("buil", ["build", "dev"])[0], "build");
  assert.equal(suggest("docotr", ["doctor", "build"])[0], "doctor");
  assert.deepEqual(suggest("zzzzzz", ["build"]), []);
});

test("help is generated from the same metadata", () => {
  const registry = registerCliCommand(
    createCliCommandRegistry(),
    command("build", {
      description: "Build the site.",
      arguments: [cliArgument("target", { description: "Build target." })],
      options: [
        cliBoolean("full", { description: "Run the full build." }),
        cliStringWithDefault("output", "dist", {
          description: "Output directory.",
        }),
      ],
      examples: [cliExample("riebeckite build .", "Build here")],
    }),
  );
  const root = formatRootHelp(registry, { width: 60, version: "1.2.3" });
  assert.match(root, /Riebeckite CLI 1\.2\.3/);
  assert.match(root, /build\s+build summary/);
  const registration = registry.registrations[0];
  assert.ok(registration);
  const help = formatCommandHelp(registry, registration.command, {
    width: 60,
  });
  assert.match(help, /Usage: riebeckite build \[target\] \[options\]/);
  assert.match(help, /--full\s+Run the full build\./);
  assert.match(help, /default: dist/);
  assert.match(help, /riebeckite build \./);
});

test("completion is generated without executing handlers", () => {
  let calls = 0;
  const registry = registerCliCommand(
    createCliCommandRegistry(),
    command("build", {
      summary: "Build $(touch nope) 'quoted'",
      options: [cliEnum("format", ["json", "text"])],
      handler: () => {
        calls += 1;
      },
    }),
  );
  const bash = generateCompletion(registry, "bash");
  const zsh = generateCompletion(registry, "zsh");
  const powershell = generateCompletion(registry, "powershell");
  assert.match(bash, /complete -F _riebeckite_completion riebeckite/);
  assert.match(bash, /--format=json/);
  assert.match(zsh, /#compdef riebeckite/);
  assert.match(powershell, /Register-ArgumentCompleter -Native/);

  const pluginRegistry = registerPluginCliExtension(registry, "acme", {
    commands: [command("hello world")],
  });
  assert.match(generateCompletion(pluginRegistry, "bash"), /acme hello/);
  assert.match(generateCompletion(pluginRegistry, "zsh"), /acme hello/);
  assert.match(generateCompletion(pluginRegistry, "powershell"), /acme hello/);
  assert.equal(calls, 0);
});
