import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { injectRiebeckiteClientBundle } from "../src/honox_islands.js";

const root = path.resolve("site");
const renderer = path.join(root, "app", "routes", "_renderer.tsx");

test("injects the HonoX client signal for plugin client entries", async () => {
  const plugin = injectRiebeckiteClientBundle(() => ({
    plugins: [
      {
        name: "fixture",
        clientEntries: [
          { pluginName: "fixture", moduleSpecifier: "fixture/client" },
        ],
      },
    ],
  }));
  await configure(plugin);

  const result = await transform(plugin, "export default null;", renderer);

  assert.equal(typeof result, "object");
  assert.match(result.code, /export const __importing_islands = true;/);
});

test("injects the HonoX client signal for Vite module IDs", async () => {
  const plugin = injectRiebeckiteClientBundle(() => ({
    plugins: [
      {
        name: "fixture",
        clientEntries: [
          { pluginName: "fixture", moduleSpecifier: "fixture/client" },
        ],
      },
    ],
  }));
  await configure(plugin);

  const result = await transform(
    plugin,
    "export default null;",
    renderer.replaceAll(path.sep, "/"),
  );

  assert.equal(typeof result, "object");
});

test("does not inject the HonoX client signal without client features", async () => {
  const plugin = injectRiebeckiteClientBundle(() => ({ plugins: [] }));
  await configure(plugin);

  assert.equal(
    await transform(plugin, "export default null;", renderer),
    undefined,
  );
});

test("injects the HonoX client signal for SPA navigation", async () => {
  const plugin = injectRiebeckiteClientBundle(() => ({
    plugins: [],
    spa: {},
  }));
  await configure(plugin);

  const result = await transform(plugin, "export default null;", renderer);

  assert.equal(typeof result, "object");
});

test("injects the HonoX client signal for Markdown client components", async () => {
  const plugin = injectRiebeckiteClientBundle(() => ({
    plugins: [
      {
        name: "fixture",
        markdownComponents: [{ name: "fixture", client: {} }],
      },
    ],
  }));
  await configure(plugin);

  const result = await transform(plugin, "export default null;", renderer);

  assert.equal(typeof result, "object");
});

test("does not duplicate an explicit HonoX client signal", async () => {
  const plugin = injectRiebeckiteClientBundle(() => ({
    plugins: [
      {
        name: "fixture",
        clientEntries: [
          { pluginName: "fixture", moduleSpecifier: "fixture/client" },
        ],
      },
    ],
  }));
  await configure(plugin);
  const source = "export const __importing_islands = true;";

  assert.equal(await transform(plugin, source, renderer), undefined);
});

async function configure(
  plugin: ReturnType<typeof injectRiebeckiteClientBundle>,
) {
  await Reflect.apply(plugin.configResolved, undefined, [{ root }]);
}

async function transform(
  plugin: ReturnType<typeof injectRiebeckiteClientBundle>,
  source: string,
  id: string,
) {
  return await Reflect.apply(plugin.transform, undefined, [source, id]);
}
