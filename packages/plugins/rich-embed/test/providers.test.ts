import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveEmbed } from "../src/providers.js";

test("rich embed rejects dangerous and non-https iframe URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
  ]) {
    assert.equal(resolveEmbed(url, {}, {}).kind, "unsupported");
  }
});

test("rich embed resolves known providers to controlled iframe origins", () => {
  const youtube = resolveEmbed(
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    { start: 42 },
    {},
  );

  assert.deepEqual(youtube, {
    kind: "iframe",
    provider: "youtube",
    src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=42",
    title: "YouTube video",
    aspect: "16/9",
  });
});

test("generic rich embeds require an explicit host allow-list", () => {
  assert.equal(
    resolveEmbed("https://widgets.example/embed", {}, {}).kind,
    "unsupported",
  );

  assert.deepEqual(
    resolveEmbed(
      "https://widgets.example/embed",
      {},
      {
        allowHosts: ["widgets.example"],
      },
    ),
    {
      kind: "iframe",
      provider: "generic",
      src: "https://widgets.example/embed",
      title: "Embedded content",
      aspect: "16/9",
    },
  );
});
