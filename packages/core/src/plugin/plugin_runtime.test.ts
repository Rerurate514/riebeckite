import assert from "node:assert/strict";
import test from "node:test";
import type { ContentManifest } from "../types/content_manifest";
import { definePlugin } from "../types/plugin";
import { PluginLifecycleError } from "./plugin_lifecycle";
import { PluginRuntime } from "./plugin_runtime";

const contentIndex = new Map<string, string>();
const manifest = {} as ContentManifest;

test("plugins without lifecycle hooks retain their existing hook behavior", async () => {
  const events: string[] = [];
  const runtime = new PluginRuntime({
    plugins: [
      definePlugin({
        name: "existing",
        onConfigResolved: () => {
          events.push("config-resolved");
        },
      }),
    ],
  });

  await runtime.startBuild(contentIndex);

  assert.deepEqual(events, ["config-resolved"]);
});

test("lifecycle hooks run in plugin order and dispose once", async () => {
  const events: string[] = [];
  const createPlugin = (name: string) =>
    definePlugin({
      name,
      setup: () => {
        events.push(`${name}:setup`);
      },
      buildStart: () => {
        events.push(`${name}:buildStart`);
      },
      buildEnd: () => {
        events.push(`${name}:buildEnd`);
      },
      dispose: () => {
        events.push(`${name}:dispose`);
      },
    });
  const runtime = new PluginRuntime({
    plugins: [createPlugin("first"), createPlugin("second")],
  });

  await runtime.startBuild(contentIndex);
  await runtime.runBuildEnd(manifest, contentIndex);
  await runtime.dispose(contentIndex);
  await runtime.dispose(contentIndex);

  assert.deepEqual(events, [
    "first:setup",
    "second:setup",
    "first:buildStart",
    "second:buildStart",
    "first:buildEnd",
    "second:buildEnd",
    "first:dispose",
    "second:dispose",
  ]);
});

test("lifecycle hook errors identify the plugin and hook while preserving cause", async () => {
  const cause = new Error("setup failed");
  const runtime = new PluginRuntime({
    plugins: [
      definePlugin({
        name: "broken",
        setup: () => {
          throw cause;
        },
      }),
    ],
  });

  await assert.rejects(
    () => runtime.startBuild(contentIndex),
    (error: unknown) => {
      assert.ok(error instanceof PluginLifecycleError);
      assert.equal(error.message, 'Plugin "broken" failed during "setup"');
      assert.equal(error.cause, cause);
      return true;
    },
  );
});
