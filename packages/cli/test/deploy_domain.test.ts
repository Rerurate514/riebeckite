import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { RiebeckiteProject } from "../src/application_root.js";
import {
  addCustomDomainToJsonc,
  CustomDomainError,
  normalizeCustomDomain,
  runDeployDomain,
} from "../src/commands/deploy_domain.js";

test("normalizeCustomDomain accepts apex, subdomain, and international domains", () => {
  assert.equal(normalizeCustomDomain("example.com"), "example.com");
  assert.equal(normalizeCustomDomain("DOCS.Example.COM"), "docs.example.com");
  assert.equal(normalizeCustomDomain("例え.テスト"), "xn--r8jz45g.xn--zckzah");
});

test("normalizeCustomDomain rejects URLs, routes, wildcards, whitespace, and IPs", () => {
  for (const input of [
    " https://example.com",
    "https://example.com",
    "example.com/path",
    "*.example.com",
    "example.com ",
    "localhost",
    "127.0.0.1",
  ]) {
    assert.throws(() => normalizeCustomDomain(input), CustomDomainError);
  }
});

test("addCustomDomainToJsonc preserves JSONC comments and existing settings", () => {
  const content = `{
  // Keep this setting
  "name": "site",
  "assets": { "directory": "./dist" },
}`;
  const result = addCustomDomainToJsonc(content, "docs.example.com");

  assert.match(result.content, /\/\/ Keep this setting/);
  assert.match(result.content, /"directory": "\.\/dist"/);
  assert.match(
    result.content,
    /"pattern": "docs\.example\.com"[\s\S]*"custom_domain": true/,
  );
  assert.equal(result.alreadyConfigured, false);
});

test("addCustomDomainToJsonc appends to an empty routes array and preserves CRLF", () => {
  const result = addCustomDomainToJsonc(
    '{\r\n  "routes": []\r\n}\r\n',
    "docs.example.com",
  );
  assert.match(result.content, /"pattern": "docs\.example\.com"/);
  assert.ok(result.content.includes("\r\n"));
});

test("addCustomDomainToJsonc is idempotent and protects conflicting routes", () => {
  const existing = `{
  "routes": [{ "pattern": "docs.example.com", "custom_domain": true }]
}`;
  assert.deepEqual(addCustomDomainToJsonc(existing, "docs.example.com"), {
    content: existing,
    alreadyConfigured: true,
  });

  assert.throws(
    () =>
      addCustomDomainToJsonc(
        '{ "routes": ["docs.example.com/*"] }',
        "docs.example.com",
      ),
    /non-Custom-Domain route/,
  );
});

test("addCustomDomainToJsonc refuses malformed and incompatible configuration", () => {
  assert.throws(
    () =>
      addCustomDomainToJsonc(
        '{ "routes": "docs.example.com" }',
        "docs.example.com",
      ),
    /routes setting is not an array/,
  );
  assert.throws(
    () => addCustomDomainToJsonc("{", "docs.example.com"),
    /safely parse/,
  );
});

test("runDeployDomain writes configuration, then uses the canonical deploy callback", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-domain-"),
  );
  const configPath = path.join(directory, "wrangler.jsonc");
  await fs.writeFile(configPath, '{ "name": "site" }\n');
  const lines: string[] = [];
  const prompts = createPrompts("docs.example.com", [true, true]);
  let deployed = false;

  try {
    await runDeployDomain(project(directory), {
      prompts,
      writeLine: (line) => lines.push(line),
      deploy: async () => {
        deployed = true;
      },
    });

    assert.equal(deployed, true);
    assert.match(await fs.readFile(configPath, "utf8"), /custom_domain/);
    assert.ok(lines.includes("✓ wrangler.jsonc updated"));
    assert.ok(lines.includes("✓ Deployed\n\nhttps://docs.example.com"));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("runDeployDomain leaves configuration unchanged when declined or TOML is used", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-domain-"),
  );
  const configPath = path.join(directory, "wrangler.json");
  const original = '{ "name": "site" }\n';
  await fs.writeFile(configPath, original);

  try {
    await runDeployDomain(project(directory), {
      prompts: createPrompts("docs.example.com", [false]),
    });
    assert.equal(await fs.readFile(configPath, "utf8"), original);

    await fs.rm(configPath);
    await fs.writeFile(
      path.join(directory, "wrangler.toml"),
      'name = "site"\n',
    );
    await assert.rejects(
      () =>
        runDeployDomain(project(directory), {
          prompts: createPrompts("docs.example.com", [true]),
        }),
      /wrangler\.toml detected/,
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("runDeployDomain requires a configuration file and an interactive terminal", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-domain-"),
  );
  try {
    await assert.rejects(
      () =>
        runDeployDomain(project(directory), {
          prompts: {
            ...createPrompts("docs.example.com", [true]),
            interactive: false,
          },
        }),
      /Could not find a Wrangler configuration file/,
    );

    await fs.writeFile(
      path.join(directory, "wrangler.json"),
      '{ "name": "site" }',
    );
    await assert.rejects(
      () =>
        runDeployDomain(project(directory), {
          prompts: {
            ...createPrompts("docs.example.com", [true]),
            interactive: false,
          },
        }),
      /interactive terminal/,
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("runDeployDomain preserves the deployment failure after saving configuration", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-domain-"),
  );
  const configPath = path.join(directory, "wrangler.json");
  await fs.writeFile(configPath, '{ "name": "site" }');
  const failure = new Error("missing build output");

  try {
    await assert.rejects(
      () =>
        runDeployDomain(project(directory), {
          prompts: createPrompts("docs.example.com", [true, true]),
          deploy: async () => {
            throw failure;
          },
        }),
      (error: unknown) =>
        error instanceof CustomDomainError && error.cause === failure,
    );
    assert.match(await fs.readFile(configPath, "utf8"), /custom_domain/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("runDeployDomain reads the Wrangler config from appRoot, not projectRoot", async () => {
  const projectRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-project-"),
  );
  const appRoot = path.join(projectRoot, "apps", "web");
  await fs.mkdir(appRoot, { recursive: true });
  const configPath = path.join(appRoot, "wrangler.json");
  await fs.writeFile(configPath, '{ "name": "site" }');

  try {
    await runDeployDomain(project(projectRoot, appRoot), {
      prompts: createPrompts("docs.example.com", [true, false]),
    });

    assert.match(await fs.readFile(configPath, "utf8"), /custom_domain/);
    assert.equal(
      await fs.stat(path.join(projectRoot, "wrangler.json")).then(
        () => true,
        () => false,
      ),
      false,
    );
  } finally {
    await fs.rm(projectRoot, { recursive: true, force: true });
  }
});

function project(
  projectRoot: string,
  appRoot = projectRoot,
): RiebeckiteProject {
  return { projectRoot, appRoot } as RiebeckiteProject;
}

function createPrompts(input: string, confirmations: readonly boolean[]) {
  let confirmationIndex = 0;
  return {
    interactive: true,
    async input() {
      return input;
    },
    async confirm() {
      const value = confirmations[confirmationIndex];
      confirmationIndex += 1;
      return value ?? false;
    },
  };
}
