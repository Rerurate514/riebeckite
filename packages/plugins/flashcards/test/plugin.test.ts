import assert from "node:assert/strict";
import { test } from "node:test";
import { flashcards } from "../index.js";

test("registers flashcard runtime dependencies and rejects invalid options", () => {
  const plugin = flashcards();
  assert.equal(plugin.name, "flashcards");
  assert.equal(plugin.processedContentCache?.version, "flashcards-v1");
  assert.equal(plugin.clientEntries?.[0]?.exportName, "initFlashcards");
  assert.deepEqual(plugin.validateOptions?.({ shuffle: "yes" } as never), [
    { path: "shuffle", message: "Expected a boolean." },
  ]);
});
