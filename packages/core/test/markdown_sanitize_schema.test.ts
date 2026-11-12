import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeMarkdownSanitizeFingerprint,
  markdownSanitizeSchema,
  safeMarkdownStyle,
} from "../src/markdown_sanitize_schema.js";

test("the sanitize fingerprint distinguishes regular expressions in the schema", () => {
  const first = computeMarkdownSanitizeFingerprint({
    attributes: { code: [["className", /^language-./]] },
  });
  const second = computeMarkdownSanitizeFingerprint({
    attributes: { code: [["className", /^language-[a-z]+$/]] },
  });
  assert.notEqual(first, second);
});

test("the sanitize fingerprint distinguishes the allowed style", () => {
  assert.notEqual(
    computeMarkdownSanitizeFingerprint(
      markdownSanitizeSchema,
      safeMarkdownStyle,
    ),
    computeMarkdownSanitizeFingerprint(
      markdownSanitizeSchema,
      /^height:\d+px$/,
    ),
  );
});

test("the sanitize fingerprint separates schemas that differ only in a value", () => {
  const base = computeMarkdownSanitizeFingerprint({
    attributes: { code: ["className"] },
  });
  const extended = computeMarkdownSanitizeFingerprint({
    attributes: { code: ["className", "dataLanguage"] },
  });
  assert.notEqual(base, extended);
});
