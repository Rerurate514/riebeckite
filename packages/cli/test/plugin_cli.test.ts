import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCli } from "../src/command/runner.js";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const pluginSource = `
import {
  cliArgument,
  cliBoolean,
  cliString,
  defineCliCommand,
  definePlugin,
} from "@riebeckite/core";

export const acmePlugin = definePlugin({
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
        options: [
          cliBoolean("loud", { description: "Use uppercase output." }),
          cliString("punctuation", { description: "Trailing punctuation.", default: "!" }),
        ],
        supportsJson: true,
        handler(context, input) {
          const message = \`Hello, \${input.arguments.name}\${input.options.punctuation}\`;
          if (context.json) {
            context.output.json({ ok: true, command: "acme greet", data: { message } });
            return;
          }
          context.output.writeLine(input.options.loud ? message.toUpperCase() : message);
        },
      }),
      defineCliCommand({
        id: "where",
        summary: "Print the project root.",
        requiresProject: true,
        async handler(context) {
          const project = await context.loadProject();
          context.output.writeLine(project.projectRoot);
        },
      }),
      defineCliCommand({
        id: "fail",
        summary: "Fail on purpose.",
        supportsJson: true,
        handler() {
          throw new Error("plugin failed on purpose");
        },
      }),
    ],
  },
});
`;

async function withProject(
  config: string,
  task: (cwd: string) => Promise<void>,
): Promise<void> {
  const cwd = await fs.mkdtemp(path.join(packageRoot, "test", "plugin-cli-"));
  try {
    await fs.mkdir(path.join(cwd, "plugins"), { recursive: true });
    await fs.writeFile(
      path.join(cwd, "plugins", "acme.ts"),
      pluginSource,
      "utf8",
    );
    await fs.mkdir(path.join(cwd, "node_modules", "@acme", "cli-plugin"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(cwd, "node_modules", "@acme", "cli-plugin", "package.json"),
      JSON.stringify({
        name: "@acme/cli-plugin",
        version: "1.0.0",
        type: "module",
        main: "./index.js",
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(cwd, "node_modules", "@acme", "cli-plugin", "index.js"),
      pluginSource,
      "utf8",
    );
    await fs.writeFile(path.join(cwd, "riebeckite.config.ts"), config, "utf8");
    await fs.writeFile(
      path.join(cwd, "vite.config.ts"),
      "export default {};\n",
      "utf8",
    );
    await task(cwd);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}

async function run(
  cwd: string,
  ...argv: string[]
): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const code = await runCli({
    argv,
    cwd,
    version: "0.0.0-test",
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  return { code, stdout, stderr };
}

const enabledConfig = `import { acmePlugin } from "@acme/cli-plugin";
export default { site: { title: "Plugin test" }, plugins: [acmePlugin] };
`;

test("runs commands from an enabled Plugin package", async () => {
  await withProject(enabledConfig, async (cwd) => {
    const result = await run(cwd, "acme", "greet", "Ada", "--loud");
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, "HELLO, ADA!\n");
    assert.equal(result.stderr, "");
  });
});

test("passes typed arguments, options, and JSON mode to plugin handlers", async () => {
  await withProject(enabledConfig, async (cwd) => {
    const result = await run(
      cwd,
      "acme",
      "greet",
      "Ada",
      "--punctuation",
      "?",
      "--json",
    );
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      ok: true,
      command: "acme greet",
      data: { message: "Hello, Ada?" },
    });
    assert.equal(result.stderr, "");
  });
});

test("generates plugin help and completion without running handlers", async () => {
  await withProject(enabledConfig, async (cwd) => {
    const help = await run(cwd, "help", "acme", "greet");
    assert.equal(help.code, 0, help.stderr);
    assert.match(help.stdout, /Usage: riebeckite acme greet/);
    assert.match(help.stdout, /--punctuation/);

    const completion = await run(cwd, "completion", "bash", "--project");
    assert.equal(completion.code, 0, completion.stderr);
    assert.match(completion.stdout, /acme/);
    assert.match(completion.stdout, /greet/);

    const rootHelp = await run(cwd, "--help");
    assert.equal(rootHelp.code, 0);
    assert.doesNotMatch(rootHelp.stdout, /acme greet/);
  });
});

test("loads project context for plugin commands that require it", async () => {
  await withProject(enabledConfig, async (cwd) => {
    const result = await run(cwd, "acme", "where");
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout.trim(), cwd);
  });
});

test("reports plugin usage errors and handler failures", async () => {
  await withProject(enabledConfig, async (cwd) => {
    const usage = await run(cwd, "acme", "greet", "Ada", "--unknown");
    assert.equal(usage.code, 2);
    assert.match(usage.stderr, /Unknown option: --unknown/);

    const missing = await run(cwd, "acme", "greet");
    assert.equal(missing.code, 2);
    assert.match(missing.stderr, /Missing required argument: name/);

    const failure = await run(cwd, "acme", "fail");
    assert.equal(failure.code, 1);
    assert.match(failure.stderr, /plugin failed on purpose/);

    const jsonFailure = await run(cwd, "acme", "fail", "--json");
    assert.equal(jsonFailure.code, 1);
    assert.deepEqual(JSON.parse(jsonFailure.stderr), {
      ok: false,
      error: {
        code: "CLI_INTERNAL_ERROR",
        message: "plugin failed on purpose",
        command: "acme fail",
        exitCode: 1,
      },
    });
  });
});

test("ignores disabled plugins and does not load them for help", async () => {
  const disabled = `import { acmePlugin } from "@acme/cli-plugin";
export default {
  site: { title: "Plugin test" },
  plugins: [{ ...acmePlugin, enabled: false }],
};
`;
  await withProject(disabled, async (cwd) => {
    const result = await run(cwd, "acme", "greet", "Ada");
    assert.equal(result.code, 2);
    assert.match(result.stderr, /Unknown command: acme/);

    const help = await run(cwd, "help", "acme", "greet");
    assert.equal(help.code, 2);
    assert.match(help.stderr, /Unknown command/);
  });
});

test("isolates duplicate and built-in namespace conflicts", async () => {
  const duplicate = `import { defineCliCommand, definePlugin } from "@riebeckite/core";
export const acmePlugin = definePlugin({
  name: "acme",
  cli: {
    namespace: "acme",
    commands: [
      defineCliCommand({ id: "same", summary: "One.", handler() {} }),
      defineCliCommand({ id: "same", summary: "Two.", handler() {} }),
    ],
  },
});
`;
  await withProject(
    `import { acmePlugin } from "./plugins/acme";
export default { site: { title: "Plugin test" }, plugins: [acmePlugin] };
`,
    async (cwd) => {
      await fs.writeFile(
        path.join(cwd, "plugins", "acme.ts"),
        duplicate,
        "utf8",
      );
      const result = await run(cwd, "help", "acme", "same");
      assert.equal(result.code, 2);
      assert.match(
        result.stderr,
        /Plugin acme could not register CLI commands/,
      );
      assert.match(result.stderr, /Duplicate command/);
    },
  );

  const conflict = `import { defineCliCommand, definePlugin } from "@riebeckite/core";
export const acmePlugin = definePlugin({
  name: "acme",
  cli: {
    namespace: "build",
    commands: [
      defineCliCommand({ id: "status", summary: "Status.", handler() {} }),
    ],
  },
});
`;
  await withProject(
    `import { acmePlugin } from "./plugins/acme";
export default { site: { title: "Plugin test" }, plugins: [acmePlugin] };
`,
    async (cwd) => {
      await fs.writeFile(
        path.join(cwd, "plugins", "acme.ts"),
        conflict,
        "utf8",
      );
      const result = await run(cwd, "help", "build", "status");
      assert.equal(result.code, 2);
      assert.match(
        result.stderr,
        /Plugin acme could not register CLI commands/,
      );
      assert.match(result.stderr, /namespace|conflict/i);
    },
  );
});
