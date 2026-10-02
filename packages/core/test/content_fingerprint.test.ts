import assert from "node:assert/strict";
import { test } from "node:test";
import { fingerprintContentEntries } from "../src/content/content_fingerprint.js";
import type {
  ContentSourceContent,
  ContentSourceEntry,
} from "../src/content/content_source.js";

test("fingerprinting keeps read concurrency bounded and returns sorted entries", async () => {
  const entries = Array.from({ length: 200 }, (_, index) => ({
    path: `note-${String(199 - index).padStart(3, "0")}.md`,
  }));
  let activeReads = 0;
  let maxActiveReads = 0;

  const fingerprinted = await fingerprintContentEntries(
    entries,
    async (entry: ContentSourceEntry): Promise<ContentSourceContent> => {
      activeReads += 1;
      maxActiveReads = Math.max(maxActiveReads, activeReads);
      await new Promise((resolve) => setImmediate(resolve));
      activeReads -= 1;
      return `# ${entry.path}`;
    },
  );

  assert.equal(maxActiveReads, 64);
  assert.deepEqual(
    fingerprinted.map(({ entry }) => entry.path),
    [...entries]
      .map((entry) => entry.path)
      .sort((left, right) => left.localeCompare(right)),
  );
});
