import assert from "node:assert/strict";
import test from "node:test";
import { riebeckiteClientModule } from "../src/client_module.js";

const config = { plugins: [] };

test("client module excludes the development inspector from production builds", async () => {
  const plugin = riebeckiteClientModule(() => config);
  const configure = hookHandler(plugin.config);
  const load = hookHandler(plugin.load);
  await Reflect.apply(configure, undefined, [
    {},
    { command: "build", mode: "production" },
  ]);
  const module = await Reflect.apply(load, undefined, [
    "\0virtual:riebeckite/client",
  ]);

  assert.equal(typeof module, "string");
  assert.doesNotMatch(module as string, /development-inspector/);
  assert.match(module as string, /ClientLifecycle/);
});

test("client module assigns client entries to their lifecycle scope", async () => {
  const plugin = riebeckiteClientModule(() => ({
    plugins: [
      {
        clientEntries: [
          { pluginName: "app", moduleSpecifier: "app-entry", scope: "app" },
          { pluginName: "page", moduleSpecifier: "page-entry" },
        ],
      },
    ],
  }));
  const load = hookHandler(plugin.load);
  const module = await Reflect.apply(load, undefined, [
    "\0virtual:riebeckite/client",
  ]);

  assert.match(module as string, /mountAppClientInitializers/);
  assert.match(module as string, /mountPageClientInitializers/);
  assert.match(module as string, /remountRiebeckitePage/);
});

test("client module imports the SPA runtime only when configured", async () => {
  const plugin = riebeckiteClientModule(() => ({ plugins: [], spa: {} }));
  const load = hookHandler(plugin.load);
  const module = await Reflect.apply(load, undefined, [
    "\0virtual:riebeckite/client",
  ]);

  assert.match(module as string, /@riebeckite\/spa/);
  assert.match(module as string, /onBeforePageCommit/);
});

test("client module initializes the development inspector while serving", async () => {
  const plugin = riebeckiteClientModule(() => config);
  const configure = hookHandler(plugin.config);
  const load = hookHandler(plugin.load);
  await Reflect.apply(configure, undefined, [
    {},
    { command: "serve", mode: "development" },
  ]);
  const module = await Reflect.apply(load, undefined, [
    "\0virtual:riebeckite/client",
  ]);

  assert.match(module as string, /development-inspector/);
});

function hookHandler<Handler extends (...arguments_: never[]) => unknown>(
  hook: Handler | { readonly handler: Handler } | undefined,
): Handler {
  assert.ok(hook);
  return typeof hook === "function" ? hook : hook.handler;
}
