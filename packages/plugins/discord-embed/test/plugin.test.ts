import assert from "node:assert/strict";
import { test } from "node:test";
import { discordEmbed } from "../index.js";

test("rejects invalid options", () => {
  assert.deepEqual(
    discordEmbed().validateOptions?.({ themeColor: "invalid" } as never),
    [
      {
        path: "themeColor",
        message: 'Expected a hex color such as "#5865F2".',
      },
    ],
  );
});
