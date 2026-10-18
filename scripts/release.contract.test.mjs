import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import test from "node:test";
import { readStageItem } from "./release.mjs";

const COMMAND_TIMEOUT_MS = 30_000;

const ITEMS = [
  {
    id: "1de6f3db-2ed9-4d72-b3dd-8f0e2b474a2f",
    packageName: "@riebeckite/plugin-series",
    version: "0.0.27",
    tag: "latest",
    createdAt: "2026-10-17T22:00:00.000Z",
    actor: "rerurate",
    actorType: "user",
    shasum: "9c73467c642a39173c889964cbffd3a47721771f",
    status: "awaiting_approval",
  },
  {
    id: "6a2f0f1e-2b3c-4d5e-8f90-112233445566",
    packageName: "@riebeckite/core",
    version: "0.0.27",
    tag: "latest",
    createdAt: "2026-10-17T22:00:01.000Z",
    actor: "rerurate",
    actorType: "user",
    shasum: "b844628a5b3f4ef5afea83a5e8d63246b539c2b4",
    status: "staged",
  },
];

const EXPECTED_ITEMS = ITEMS.map((item) => ({
  stageId: item.id,
  name: item.packageName,
  version: item.version,
  shasum: item.shasum,
}));

function spawnCommand(command, args) {
  const useShell = process.platform === "win32";
  const child = useShell
    ? spawn([command, ...args].join(" "), {
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
      })
    : spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill();
      resolve({ status: null, signal: "timeout", stdout, stderr });
    }, COMMAND_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve({ status: null, signal: error.message, stdout, stderr });
    });

    child.on("close", (status, signal) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve({ status, signal, stdout, stderr });
    });
  });
}

function npmSupportsStage() {
  const useShell = process.platform === "win32";
  const args = ["stage", "--help"];

  const result = useShell
    ? spawnSync(["npm", ...args].join(" "), {
        shell: true,
        encoding: "utf8",
        timeout: COMMAND_TIMEOUT_MS,
      })
    : spawnSync("npm", args, { encoding: "utf8", timeout: COMMAND_TIMEOUT_MS });

  const text = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  return (
    result.status === 0 &&
    ["list", "view", "approve", "reject"].every((command) =>
      text.includes(command),
    )
  );
}

async function withMockRegistry(run) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");

    if (url.pathname === "/-/stage") {
      const packageName = url.searchParams.get("package");

      const items = packageName
        ? ITEMS.filter((item) => item.packageName === packageName)
        : ITEMS;

      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          items,
          total: items.length,
          page: 0,
          perPage: 100,
        }),
      );

      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  const registry = `http://127.0.0.1:${port}/`;

  try {
    return await run(async (args) => {
      const result = await spawnCommand("npm", [
        ...args,
        "--json",
        "--registry",
        registry,
      ]);

      assert.notEqual(result.signal, "timeout", "npm stage list timed out");
      assert.equal(result.status, 0, result.stderr);

      return result.stdout;
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test("npm stage list --json emits the item shape that readStageItem parses", async (t) => {
  if (!npmSupportsStage()) {
    t.skip("npm stage subcommand is unavailable");
    return;
  }

  await withMockRegistry(async (runNpm) => {
    const stdout = await runNpm(["stage", "list"]);
    const parsed = JSON.parse(stdout);

    assert.ok(Array.isArray(parsed));
    assert.equal(parsed.length, ITEMS.length);

    for (const item of parsed) {
      assert.equal(typeof item.id, "string");
      assert.equal(typeof item.packageName, "string");
      assert.equal(typeof item.version, "string");
      assert.equal(typeof item.status, "string");
    }

    assert.deepEqual(parsed.map(readStageItem), EXPECTED_ITEMS);
  });
});

test("npm stage list <name> --json returns the matching package", async (t) => {
  if (!npmSupportsStage()) {
    t.skip("npm stage subcommand is unavailable");
    return;
  }

  await withMockRegistry(async (runNpm) => {
    const stdout = await runNpm(["stage", "list", "@riebeckite/plugin-series"]);

    assert.deepEqual(JSON.parse(stdout).map(readStageItem), [
      EXPECTED_ITEMS[0],
    ]);
  });
});

test("npm stage list <name> --json prints an empty array when nothing is staged", async (t) => {
  if (!npmSupportsStage()) {
    t.skip("npm stage subcommand is unavailable");
    return;
  }

  await withMockRegistry(async (runNpm) => {
    const stdout = await runNpm(["stage", "list", "@riebeckite/absent"]);

    assert.deepEqual(JSON.parse(stdout), []);
  });
});
