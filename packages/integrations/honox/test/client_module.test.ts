import assert from "node:assert/strict";
import test from "node:test";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { riebeckiteClientModule } from "../src/client_module.js";

const config = { plugins: [] } as ResolvedRiebeckiteConfig;

test("client module excludes the development inspector from production builds", async () => {
  const plugin = riebeckiteClientModule(() => config);
  await plugin.config?.({}, { command: "build", mode: "production" });
  const module = await plugin.load?.("\0virtual:riebeckite/client");

  assert.equal(typeof module, "string");
  assert.doesNotMatch(module as string, /development-inspector/);
});

test("client module initializes the development inspector while serving", async () => {
  const plugin = riebeckiteClientModule(() => config);
  await plugin.config?.({}, { command: "serve", mode: "development" });
  const module = await plugin.load?.("\0virtual:riebeckite/client");

  assert.match(module as string, /development-inspector/);
});
