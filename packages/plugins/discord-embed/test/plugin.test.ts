import assert from "node:assert/strict";
import { test } from "node:test";
import { discordEmbed } from "../index.js";

test("registers Discord metadata and rejects invalid options", () => {
  const plugin = discordEmbed();
  assert.equal(plugin.name, "discord-embed");
  assert.equal(typeof plugin.onManifestCreated, "function");
  assert.deepEqual(
    plugin.validateOptions?.({ themeColor: "invalid" } as never),
    [
      {
        path: "themeColor",
        message: 'Expected a hex color such as "#5865F2".',
      },
    ],
  );
});
