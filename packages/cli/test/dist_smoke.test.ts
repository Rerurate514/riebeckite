import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const createRiebeckiteRoot = path.resolve(
  packageRoot,
  "..",
  "create-riebeckite",
);
const cliBundle = path.join(packageRoot, "dist", "cli.js");
const cliBin = path.join(packageRoot, "bin", "riebeckite.mjs");

function build(packagePath: string): void {
  const result = spawnSync("pnpm run build", {
    cwd: packagePath,
    encoding: "utf8",
    shell: true,
  });
  assert.equal(
    result.status,
    0,
    `Building ${packagePath} failed:\n${result.stdout ?? ""}${result.stderr ?? ""}`,
  );
}

before(() => {
  build(createRiebeckiteRoot);
  for (const name of ["docs", "obsidian-markdown", "toc"]) {
    build(path.resolve(packageRoot, "..", "plugins", name));
  }
  build(packageRoot);
});

function runCli(entry: string, ...args: readonly string[]) {
  return spawnSync(process.execPath, [entry, ...args], {
    cwd: packageRoot,
    encoding: "utf8",
  });
}

function assertNoUnresolvedImports(output: string): void {
  assert.doesNotMatch(output, /Cannot find module/);
  assert.doesNotMatch(output, /Dynamic require of/);
  assert.doesNotMatch(output, /MODULE_NOT_FOUND/);
}

test("the built CLI bundle starts without unresolved dynamic imports", () => {
  const result = runCli(cliBundle, "init", "--list-presets");
  const output = `${result.stdout}${result.stderr}`;

  assertNoUnresolvedImports(output);
  assert.match(output, /Available presets:/);
});

test("the published bin wrapper starts the built CLI bundle", () => {
  const result = runCli(cliBin, "--help");
  const output = `${result.stdout}${result.stderr}`;

  assertNoUnresolvedImports(output);
  assert.match(output, /Usage: riebeckite/);
});

test("doctor JSON output is machine-readable and does not expose execution details", () => {
  const project = fs.mkdtempSync(path.join(packageRoot, "test", "doctor-"));
  try {
    fs.writeFileSync(
      path.join(project, "riebeckite.config.ts"),
      'export default { site: { title: "Doctor test" } };\n',
    );
    fs.writeFileSync(
      path.join(project, "vite.config.ts"),
      "export default {};\n",
    );
    const result = spawnSync(
      process.execPath,
      [cliBundle, "doctor", "--json"],
      {
        cwd: project,
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 1, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.summary.errors, 2);
    assert.equal(result.stderr, "");
    assert.doesNotMatch(result.stdout, /doctor-|private|secret/i);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test("the built CLI scaffolds a project through the external create-riebeckite package", () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-cli-init-"),
  );
  try {
    const siteDir = path.join(temporary, "site");
    const result = spawnSync(
      process.execPath,
      [cliBundle, "init", siteDir, "--preset", "minimal"],
      { cwd: temporary, encoding: "utf8" },
    );
    const output = `${result.stdout}${result.stderr}`;
    assert.equal(result.status, 0, output);
    assertNoUnresolvedImports(output);

    for (const relative of [
      "package.json",
      "riebeckite.config.ts",
      "app/server.ts",
      "content/index.md",
    ]) {
      assert.ok(
        fs.existsSync(path.join(siteDir, relative)),
        `${relative} must be generated`,
      );
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("the built CLI previews an isolated local Theme", async () => {
  const project = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-preview-"),
  );
  const themeRoot = path.join(project, "themes", "sample");
  const source = `import { defineTheme } from "@riebeckite/core";

export const sampleTheme = defineTheme({
  name: "sample",
  styles: [{ moduleSpecifier: "/themes/sample/styles/theme.css" }],
});
`;
  const updatedSource = source.replace("theme.css", "updated.css");
  const port = await reservePort();
  await fsPromises.mkdir(path.join(themeRoot, "styles"), { recursive: true });
  await fsPromises.writeFile(path.join(themeRoot, "index.ts"), source, "utf8");
  await fsPromises.writeFile(
    path.join(themeRoot, "styles", "theme.css"),
    ":root { --theme-preview-test: active; }\n",
    "utf8",
  );
  await fsPromises.writeFile(
    path.join(themeRoot, "styles", "updated.css"),
    ":root { --theme-preview-updated: active; }\n",
    "utf8",
  );
  const child = spawn(
    process.execPath,
    [
      cliBundle,
      "theme",
      "preview",
      "sample",
      "--port",
      String(port),
      "--no-open",
    ],
    { cwd: project, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    output += chunk;
  });

  try {
    await waitFor(() =>
      output.includes(`Theme preview: http://127.0.0.1:${port}/`),
    );
    const [home, article, stylesheet] = await Promise.all(
      ["/", "/article", "/app/style.css"].map(async (pathname) => {
        const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
        assert.equal(response.status, 200);
        return response.text();
      }),
    );
    assert.match(home, /Theme preview/);
    assert.match(article, /Heading one/);
    assert.match(stylesheet, /--theme-preview-test: active/);
    assert.equal(
      await fsPromises.readFile(path.join(themeRoot, "index.ts"), "utf8"),
      source,
    );
    await fsPromises.writeFile(
      path.join(themeRoot, "index.ts"),
      updatedSource,
      "utf8",
    );
    await waitForAsync(async () =>
      (
        await (await fetch(`http://127.0.0.1:${port}/app/style.css`)).text()
      ).includes("--theme-preview-updated: active"),
    );
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGKILL");
      await once(child, "exit");
    }
    await fsPromises.rm(project, { recursive: true, force: true });
  }
});

async function reservePort(): Promise<number> {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Could not reserve a port.");
  const { port } = address;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (!predicate()) {
    if (Date.now() > deadline)
      throw new Error("Theme preview server did not start.");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function waitForAsync(predicate: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (true) {
    try {
      if (await predicate()) return;
    } catch {}
    if (Date.now() > deadline)
      throw new Error("Theme preview server did not reload.");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

test("the built CLI scaffolds a deployment-enabled project", () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "riebeckite-cli-deploy-"),
  );
  try {
    const siteDir = path.join(temporary, "site");
    const result = spawnSync(
      process.execPath,
      [cliBundle, "init", siteDir, "--preset", "minimal", "--github-actions"],
      { cwd: temporary, encoding: "utf8" },
    );
    const output = `${result.stdout}${result.stderr}`;
    assert.equal(result.status, 0, output);
    assertNoUnresolvedImports(output);
    assert.ok(
      fs.existsSync(path.join(siteDir, "wrangler.jsonc")),
      "wrangler.jsonc must be generated",
    );
    assert.ok(
      fs.existsSync(path.join(siteDir, ".github", "workflows", "deploy.yml")),
      "the deployment workflow must be generated",
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("the built CLI bundle externalizes the scaffold instead of inlining templates", () => {
  const bundle = fs.readFileSync(cliBundle, "utf8");
  assert.match(bundle, /create-riebeckite\/scaffold/);
  assert.doesNotMatch(bundle, /Riebeckite scaffold templates were not found/);
  assert.doesNotMatch(bundle, /templates\/scaffold/);
  assert.ok(!fs.existsSync(path.join(packageRoot, "dist", "templates")));
  assert.ok(!fs.existsSync(path.join(packageRoot, "templates")));
  assert.ok(!fs.existsSync(path.join(packageRoot, "assets")));
});
