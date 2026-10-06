import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { deploymentWorkflow } from "create-riebeckite/scaffold";
import type { RiebeckiteProject } from "../src/application_root.js";
import {
  CloudflareAccountError,
  CloudflareAuthenticationError,
  CloudflareTokenError,
  DeploySetupError,
  GitHubAuthenticationError,
  GitHubCliNotFoundError,
  GitHubRemoteMissingError,
  GitHubRepositoryAccessError,
  GitHubSecretError,
  GitRepositoryMissingError,
  isWranglerLoggedOut,
  looksLikeRiebeckiteWorkflow,
  normalizeWorkflow,
  parseCloudflareAccounts,
  parseGitRemoteUrl,
  parseSecretNames,
  runDeploySetup,
} from "../src/commands/deploy_setup.js";
import type { CommandResult, CommandRunner } from "../src/process_runner.js";
import type { SetupPrompts } from "../src/prompts.js";

const WORKFLOW_RELATIVE_PATH = ".github/workflows/deploy.yml";

type Call = {
  command: string;
  args: readonly string[];
  input: string | undefined;
  cwd: string | undefined;
};

type Handler = {
  command: string;
  match?: (args: readonly string[]) => boolean;
  result: CommandResult | ((call: Call) => CommandResult);
};

function ok(stdout = ""): CommandResult {
  return { code: 0, stdout, stderr: "" };
}

function fail(code = 1, stderr = ""): CommandResult {
  return { code, stdout: "", stderr };
}

function createRunner(handlers: readonly Handler[]): {
  runner: CommandRunner;
  calls: Call[];
} {
  const calls: Call[] = [];
  const runner: CommandRunner = {
    async run(command, args, options = {}) {
      calls.push({
        command,
        args: [...args],
        input: options.input,
        cwd: options.cwd,
      });
      const handler = handlers.find(
        (candidate) =>
          candidate.command === command &&
          (candidate.match === undefined || candidate.match(args)),
      );
      if (handler === undefined) return fail(127, `no handler: ${command}`);
      return typeof handler.result === "function"
        ? handler.result({
            command,
            args: [...args],
            input: options.input,
            cwd: options.cwd,
          })
        : handler.result;
    },
  };
  return { runner, calls };
}

type PromptRecording = {
  prompts: SetupPrompts;
  selects: { message: string; labels: string[] }[];
  confirms: string[];
  passwords: string[];
};

function createPrompts(
  config: {
    interactive?: boolean;
    selectIndex?: number;
    confirm?: boolean;
    password?: string;
  } = {},
): PromptRecording {
  const selects: { message: string; labels: string[] }[] = [];
  const confirms: string[] = [];
  const passwords: string[] = [];
  const prompts: SetupPrompts = {
    interactive: config.interactive ?? true,
    async select(message, choices) {
      selects.push({ message, labels: choices.map((choice) => choice.label) });
      const choice = choices[config.selectIndex ?? 0];
      if (choice === undefined) throw new Error("no choice available");
      return choice.value;
    },
    async confirm(message, initial) {
      confirms.push(message);
      return config.confirm ?? initial;
    },
    async password(message) {
      passwords.push(message);
      return config.password ?? "cf-token";
    },
  };
  return { prompts, selects, confirms, passwords };
}

const SINGLE_ACCOUNT = JSON.stringify({
  loggedIn: true,
  authType: "OAuth Token",
  email: "user@example.com",
  accounts: [{ id: "acct-1", name: "Personal" }],
  tokenPermissions: [],
});

const TWO_ACCOUNTS = JSON.stringify({
  loggedIn: true,
  authType: "OAuth Token",
  email: "user@example.com",
  accounts: [
    { id: "acct-1", name: "Personal" },
    { id: "acct-2", name: "Organization" },
  ],
  tokenPermissions: [],
});

function baseHandlers(repoRoot: string): Handler[] {
  return [
    {
      command: "git",
      match: (args) => args[0] === "rev-parse",
      result: ok(`${repoRoot}\n`),
    },
    {
      command: "git",
      match: (args) => args[0] === "remote" && args.length === 1,
      result: ok("origin\n"),
    },
    {
      command: "git",
      match: (args) => args[0] === "remote" && args[1] === "get-url",
      result: ok("git@github.com:owner/site.git\n"),
    },
    { command: "gh", match: (args) => args[0] === "auth", result: ok("ok\n") },
    {
      command: "gh",
      match: (args) => args[0] === "repo",
      result: ok('{"nameWithOwner":"owner/site"}'),
    },
    {
      command: "gh",
      match: (args) => args[0] === "secret" && args[1] === "list",
      result: ok("[]"),
    },
    {
      command: "gh",
      match: (args) => args[0] === "api",
      result: ok('{"enabled":true}'),
    },
    {
      command: "gh",
      match: (args) => args[0] === "secret" && args[1] === "set",
      result: ok(""),
    },
    { command: process.execPath, result: ok(SINGLE_ACCOUNT) },
  ];
}

async function makeRepo(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-setup-"));
}

async function removeRepo(repoRoot: string): Promise<void> {
  await fs.rm(repoRoot, { recursive: true, force: true });
}

type SetupResult = { lines: string[]; calls: Call[] };

async function setup(
  repoRoot: string,
  handlers: readonly Handler[],
  prompts: SetupPrompts,
  env: NodeJS.ProcessEnv = {},
): Promise<SetupResult> {
  const { runner, calls } = createRunner(handlers);
  const lines: string[] = [];
  const project = { projectRoot: repoRoot } as unknown as RiebeckiteProject;
  await runDeploySetup(project, {
    runner,
    prompts,
    env,
    resolveWrangler: async () => "/fake/wrangler/index.js",
    openBrowser: () => {},
    writeLine: (line) => lines.push(line),
  });
  return { lines, calls };
}

function expectedWorkflow(): string {
  return deploymentWorkflow();
}

async function writeWorkflow(
  repoRoot: string,
  content: string,
): Promise<string> {
  const filePath = path.join(repoRoot, WORKFLOW_RELATIVE_PATH);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

function secretSetCalls(calls: readonly Call[]): Call[] {
  return calls.filter(
    (call) =>
      call.command === "gh" &&
      call.args[0] === "secret" &&
      call.args[1] === "set",
  );
}

async function filesContain(
  repoRoot: string,
  needle: string,
): Promise<boolean> {
  for (const entry of await fs.readdir(repoRoot, { withFileTypes: true })) {
    const full = path.join(repoRoot, entry.name);
    if (entry.isDirectory()) {
      if (await filesContain(full, needle)) return true;
    } else if (entry.isFile()) {
      const content = await fs.readFile(full, "utf8").catch(() => "");
      if (content.includes(needle)) return true;
    }
  }
  return false;
}

test("parseGitRemoteUrl recognizes GitHub remotes only", () => {
  assert.equal(
    parseGitRemoteUrl("git@github.com:owner/site.git"),
    "owner/site",
  );
  assert.equal(
    parseGitRemoteUrl("https://github.com/owner/site.git"),
    "owner/site",
  );
  assert.equal(
    parseGitRemoteUrl("https://github.com/owner/site"),
    "owner/site",
  );
  assert.equal(
    parseGitRemoteUrl("ssh://git@github.com/owner/site.git"),
    "owner/site",
  );
  assert.equal(
    parseGitRemoteUrl("ssh://git@github.com:22/owner/site.git"),
    "owner/site",
  );
  assert.equal(
    parseGitRemoteUrl("https://gitlab.com/owner/site.git"),
    undefined,
  );
  assert.equal(
    parseGitRemoteUrl("git@github.example.com:owner/site.git"),
    undefined,
  );
  assert.equal(parseGitRemoteUrl("not a url"), undefined);
});

test("parseCloudflareAccounts reads logged-in accounts", () => {
  assert.equal(parseCloudflareAccounts("{}"), undefined);
  assert.equal(parseCloudflareAccounts('{"loggedIn":false}'), undefined);
  assert.equal(isWranglerLoggedOut('{"loggedIn":false}'), true);
  assert.equal(isWranglerLoggedOut(SINGLE_ACCOUNT), false);
  assert.equal(isWranglerLoggedOut("{}"), false);
  const accounts = parseCloudflareAccounts(TWO_ACCOUNTS);
  assert.deepEqual(accounts, [
    { id: "acct-1", name: "Personal" },
    { id: "acct-2", name: "Organization" },
  ]);
});

test("parseSecretNames reads secret names only", () => {
  const names = parseSecretNames(
    '[{"name":"CLOUDFLARE_API_TOKEN","updatedAt":"x"}]',
  );
  assert.deepEqual([...names], ["CLOUDFLARE_API_TOKEN"]);
  assert.equal(parseSecretNames("not json").size, 0);
});

test("looksLikeRiebeckiteWorkflow and normalizeWorkflow", () => {
  const workflow = expectedWorkflow();
  assert.equal(looksLikeRiebeckiteWorkflow(workflow), true);
  assert.equal(looksLikeRiebeckiteWorkflow("name: custom"), false);
  assert.equal(normalizeWorkflow("a\r\n b \r\n"), normalizeWorkflow("a\n b\n"));
});

test("setup fails when the project is not a Git repository", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      {
        command: "git",
        match: (args) => args[0] === "rev-parse",
        result: fail(128),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    await assert.rejects(
      setup(repoRoot, handlers, prompts),
      GitRepositoryMissingError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup fails when there is no GitHub remote", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      {
        command: "git",
        match: (args) => args[0] === "remote" && args.length === 1,
        result: ok(""),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    await assert.rejects(
      setup(repoRoot, handlers, prompts),
      GitHubRemoteMissingError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup fails when the only remote is not GitHub", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      {
        command: "git",
        match: (args) => args[0] === "remote" && args[1] === "get-url",
        result: ok("https://gitlab.com/owner/site.git\n"),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    await assert.rejects(
      setup(repoRoot, handlers, prompts),
      GitHubRemoteMissingError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup reports a missing GitHub CLI", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      { command: "gh", match: (args) => args[0] === "auth", result: fail(127) },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    await assert.rejects(
      setup(repoRoot, handlers, prompts),
      GitHubCliNotFoundError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup reports unauthenticated GitHub CLI", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      { command: "gh", match: (args) => args[0] === "auth", result: fail(1) },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    await assert.rejects(
      setup(repoRoot, handlers, prompts),
      GitHubAuthenticationError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup reports an inaccessible GitHub repository", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      { command: "gh", match: (args) => args[0] === "repo", result: fail(1) },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    await assert.rejects(
      setup(repoRoot, handlers, prompts),
      GitHubRepositoryAccessError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup asks which GitHub repository to use when there are several", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      {
        command: "git",
        match: (args) => args[0] === "remote" && args.length === 1,
        result: ok("origin\nupstream\n"),
      },
      {
        command: "git",
        match: (args) => args[0] === "remote" && args[2] === "origin",
        result: ok("git@github.com:owner/site.git\n"),
      },
      {
        command: "git",
        match: (args) => args[0] === "remote" && args[2] === "upstream",
        result: ok("https://github.com/other/other-site.git\n"),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts, selects } = createPrompts({ selectIndex: 1 });
    const { calls } = await setup(repoRoot, handlers, prompts, {
      CLOUDFLARE_API_TOKEN: "token",
    });
    assert.equal(selects.length, 1);
    const view = calls.find(
      (call) => call.command === "gh" && call.args[0] === "repo",
    );
    assert.equal(view?.args[2], "other/other-site");
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup writes the workflow and registers both secrets", async () => {
  const repoRoot = await makeRepo();
  try {
    const { prompts } = createPrompts();
    const { lines, calls } = await setup(
      repoRoot,
      baseHandlers(repoRoot),
      prompts,
      { CLOUDFLARE_API_TOKEN: "env-token" },
    );
    const workflow = await fs.readFile(
      path.join(repoRoot, WORKFLOW_RELATIVE_PATH),
      "utf8",
    );
    assert.equal(workflow, expectedWorkflow());
    assert.ok(lines.includes("✓ Created .github/workflows/deploy.yml"));
    assert.ok(lines.includes("Continuous deployment is ready."));

    const setCalls = secretSetCalls(calls);
    assert.deepEqual(
      setCalls.map((call) => call.args[2]),
      ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
    );
    assert.equal(setCalls[0]?.input, "acct-1");
    assert.equal(setCalls[1]?.input, "env-token");
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup leaves a matching workflow unchanged and skips existing secrets", async () => {
  const repoRoot = await makeRepo();
  try {
    await writeWorkflow(repoRoot, expectedWorkflow());
    const handlers: Handler[] = [
      {
        command: "gh",
        match: (args) => args[0] === "secret" && args[1] === "list",
        result: ok(
          JSON.stringify([
            { name: "CLOUDFLARE_ACCOUNT_ID" },
            { name: "CLOUDFLARE_API_TOKEN" },
          ]),
        ),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    const { lines, calls } = await setup(repoRoot, handlers, prompts);
    assert.ok(
      lines.includes("✓ .github/workflows/deploy.yml already configured"),
    );
    assert.ok(lines.includes("✓ CLOUDFLARE_ACCOUNT_ID already configured"));
    assert.ok(lines.includes("✓ CLOUDFLARE_API_TOKEN already configured"));
    assert.equal(secretSetCalls(calls).length, 0);
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup never overwrites an unknown workflow", async () => {
  const repoRoot = await makeRepo();
  try {
    const custom =
      "name: Custom\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n";
    const filePath = await writeWorkflow(repoRoot, custom);
    const { prompts } = createPrompts();
    const { lines, calls } = await setup(
      repoRoot,
      baseHandlers(repoRoot),
      prompts,
      { CLOUDFLARE_API_TOKEN: "env-token" },
    );
    assert.equal(await fs.readFile(filePath, "utf8"), custom);
    assert.ok(lines.includes("Existing deployment workflow detected."));
    assert.ok(lines.includes("  No changes were made."));
    assert.equal(secretSetCalls(calls).length, 0);
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup detects an older Riebeckite workflow and leaves it alone", async () => {
  const repoRoot = await makeRepo();
  try {
    const older =
      "name: Deploy to Cloudflare Workers\non: push\njobs:\n  deploy:\n    steps:\n      - uses: cloudflare/wrangler-action@v3\n      - run: npm exec riebeckite build\n";
    await writeWorkflow(repoRoot, older);
    const { prompts } = createPrompts();
    const { lines } = await setup(repoRoot, baseHandlers(repoRoot), prompts, {
      CLOUDFLARE_API_TOKEN: "env-token",
    });
    assert.ok(
      lines.includes("Existing Riebeckite deployment workflow detected."),
    );
    assert.ok(lines.includes("  No changes were made."));
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup resumes after a partial failure", async () => {
  const repoRoot = await makeRepo();
  try {
    const tokenFailure: Handler[] = [
      {
        command: "gh",
        match: (args) =>
          args[0] === "secret" &&
          args[1] === "set" &&
          args[2] === "CLOUDFLARE_API_TOKEN",
        result: fail(1),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts: firstPrompts } = createPrompts();
    await assert.rejects(
      setup(repoRoot, tokenFailure, firstPrompts, {
        CLOUDFLARE_API_TOKEN: "env-token",
      }),
      GitHubSecretError,
    );

    const accountConfigured: Handler[] = [
      {
        command: "gh",
        match: (args) => args[0] === "secret" && args[1] === "list",
        result: ok(JSON.stringify([{ name: "CLOUDFLARE_ACCOUNT_ID" }])),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts: secondPrompts } = createPrompts();
    const { lines, calls } = await setup(
      repoRoot,
      accountConfigured,
      secondPrompts,
      {
        CLOUDFLARE_API_TOKEN: "env-token",
      },
    );
    assert.ok(lines.includes("✓ CLOUDFLARE_ACCOUNT_ID already configured"));
    const setCalls = secretSetCalls(calls);
    assert.deepEqual(
      setCalls.map((call) => call.args[2]),
      ["CLOUDFLARE_API_TOKEN"],
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup reports unauthenticated Wrangler", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      { command: process.execPath, result: fail(1) },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    await assert.rejects(
      setup(repoRoot, handlers, prompts, { CLOUDFLARE_API_TOKEN: "env-token" }),
      CloudflareAuthenticationError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup rejects Wrangler output without accounts", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      { command: process.execPath, result: ok("{}") },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    await assert.rejects(
      setup(repoRoot, handlers, prompts, { CLOUDFLARE_API_TOKEN: "env-token" }),
      CloudflareAccountError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup reports Wrangler that exited zero while logged out", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      { command: process.execPath, result: ok('{"loggedIn":false}') },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    await assert.rejects(
      setup(repoRoot, handlers, prompts, { CLOUDFLARE_API_TOKEN: "env-token" }),
      CloudflareAuthenticationError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup asks which Cloudflare account to use when several exist", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      { command: process.execPath, result: ok(TWO_ACCOUNTS) },
      ...baseHandlers(repoRoot),
    ];
    const { prompts, selects } = createPrompts({ selectIndex: 1 });
    const { calls } = await setup(repoRoot, handlers, prompts, {
      CLOUDFLARE_API_TOKEN: "env-token",
    });
    assert.equal(selects.length, 1);
    const accountSet = secretSetCalls(calls)[0];
    assert.equal(accountSet?.args[2], "CLOUDFLARE_ACCOUNT_ID");
    assert.equal(accountSet?.input, "acct-2");
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup honors CLOUDFLARE_ACCOUNT_ID without prompting", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      { command: process.execPath, result: ok(TWO_ACCOUNTS) },
      ...baseHandlers(repoRoot),
    ];
    const { prompts, selects } = createPrompts();
    const { calls } = await setup(repoRoot, handlers, prompts, {
      CLOUDFLARE_ACCOUNT_ID: "acct-2",
      CLOUDFLARE_API_TOKEN: "env-token",
    });
    assert.equal(selects.length, 0);
    assert.equal(secretSetCalls(calls)[0]?.input, "acct-2");
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup requires CLOUDFLARE_ACCOUNT_ID when non-interactive with several accounts", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      { command: process.execPath, result: ok(TWO_ACCOUNTS) },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts({ interactive: false });
    await assert.rejects(
      setup(repoRoot, handlers, prompts, { CLOUDFLARE_API_TOKEN: "env-token" }),
      CloudflareAccountError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup reads the API token through a hidden prompt", async () => {
  const repoRoot = await makeRepo();
  try {
    const { prompts, passwords, confirms } = createPrompts({
      password: "pasted-token",
    });
    const { calls } = await setup(repoRoot, baseHandlers(repoRoot), prompts);
    assert.equal(passwords.length, 1);
    assert.equal(confirms.length, 1);
    const tokenSet = secretSetCalls(calls).find(
      (call) => call.args[2] === "CLOUDFLARE_API_TOKEN",
    );
    assert.equal(tokenSet?.input, "pasted-token");
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup requires CLOUDFLARE_API_TOKEN when non-interactive without a token", async () => {
  const repoRoot = await makeRepo();
  try {
    const { prompts } = createPrompts({ interactive: false });
    await assert.rejects(
      setup(repoRoot, baseHandlers(repoRoot), prompts),
      CloudflareTokenError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup keeps the token out of argv, output, and files", async () => {
  const repoRoot = await makeRepo();
  try {
    const token = "super-secret-token-value";
    const { prompts } = createPrompts({ password: token });
    const { lines, calls } = await setup(
      repoRoot,
      baseHandlers(repoRoot),
      prompts,
    );
    for (const call of calls) {
      assert.equal(call.args.includes(token), false);
      assert.equal(call.command.includes(token), false);
    }
    assert.equal(lines.join("\n").includes(token), false);
    assert.equal(await filesContain(repoRoot, token), false);
    const tokenSet = secretSetCalls(calls).find(
      (call) => call.args[2] === "CLOUDFLARE_API_TOKEN",
    );
    assert.equal(tokenSet?.input, token);
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup keeps the token out of error output when registration fails", async () => {
  const repoRoot = await makeRepo();
  try {
    const token = "super-secret-token-value";
    const handlers: Handler[] = [
      {
        command: "gh",
        match: (args) =>
          args[0] === "secret" &&
          args[1] === "set" &&
          args[2] === "CLOUDFLARE_API_TOKEN",
        result: fail(1),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts({ password: token });
    let message = "";
    await assert.rejects(
      setup(repoRoot, handlers, prompts, {
        CLOUDFLARE_ACCOUNT_ID: "acct-1",
      }),
      (error: unknown) => {
        message = String(error);
        return error instanceof GitHubSecretError;
      },
    );
    assert.equal(message.includes(token), false);
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup refuses to run from a subdirectory of the Git repository", async () => {
  const repoRoot = await makeRepo();
  try {
    const siteRoot = path.join(repoRoot, "site");
    await fs.mkdir(siteRoot, { recursive: true });
    const { runner } = createRunner(baseHandlers(repoRoot));
    const { prompts } = createPrompts();
    const project = { projectRoot: siteRoot } as unknown as RiebeckiteProject;
    await assert.rejects(
      runDeploySetup(project, {
        runner,
        prompts,
        env: {},
        resolveWrangler: async () => "/fake/wrangler/index.js",
        openBrowser: () => {},
        writeLine: () => {},
      }),
      DeploySetupError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup requires an interactive terminal for several GitHub remotes", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      {
        command: "git",
        match: (args) => args[0] === "remote" && args.length === 1,
        result: ok("origin\nupstream\n"),
      },
      {
        command: "git",
        match: (args) => args[0] === "remote" && args[2] === "origin",
        result: ok("git@github.com:owner/site.git\n"),
      },
      {
        command: "git",
        match: (args) => args[0] === "remote" && args[2] === "upstream",
        result: ok("https://github.com/other/other-site.git\n"),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts, selects } = createPrompts({ interactive: false });
    await assert.rejects(
      setup(repoRoot, handlers, prompts, { CLOUDFLARE_API_TOKEN: "env-token" }),
      GitHubRemoteMissingError,
    );
    assert.equal(selects.length, 0);
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup reports a failure to list repository secrets", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      {
        command: "gh",
        match: (args) => args[0] === "secret" && args[1] === "list",
        result: fail(1),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    await assert.rejects(
      setup(repoRoot, handlers, prompts, { CLOUDFLARE_API_TOKEN: "env-token" }),
      GitHubSecretError,
    );
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup reports when GitHub Actions is disabled", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      {
        command: "gh",
        match: (args) => args[0] === "api",
        result: ok('{"enabled":false}'),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    const { lines } = await setup(repoRoot, handlers, prompts, {
      CLOUDFLARE_API_TOKEN: "env-token",
    });
    assert.ok(lines.includes("Continuous deployment is almost ready."));
    assert.ok(
      lines.includes("GitHub Actions is disabled for this repository."),
    );
    assert.equal(lines.includes("Continuous deployment is ready."), false);
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup notes when the default branch is not main", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      {
        command: "gh",
        match: (args) => args[0] === "repo",
        result: ok(
          '{"nameWithOwner":"owner/site","defaultBranchRef":{"name":"trunk"}}',
        ),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts } = createPrompts();
    const { lines } = await setup(repoRoot, handlers, prompts, {
      CLOUDFLARE_API_TOKEN: "env-token",
    });
    assert.ok(
      lines.includes("Note: the generated workflow deploys on pushes to main."),
    );
    assert.ok(lines.includes("This repository's default branch is trunk."));
  } finally {
    await removeRepo(repoRoot);
  }
});

test("setup does not prompt for a token that is already configured", async () => {
  const repoRoot = await makeRepo();
  try {
    const handlers: Handler[] = [
      {
        command: "gh",
        match: (args) => args[0] === "secret" && args[1] === "list",
        result: ok(JSON.stringify([{ name: "CLOUDFLARE_API_TOKEN" }])),
      },
      ...baseHandlers(repoRoot),
    ];
    const { prompts, passwords } = createPrompts();
    const { lines } = await setup(repoRoot, handlers, prompts);
    assert.equal(passwords.length, 0);
    assert.ok(lines.includes("✓ CLOUDFLARE_API_TOKEN already configured"));
  } finally {
    await removeRepo(repoRoot);
  }
});
