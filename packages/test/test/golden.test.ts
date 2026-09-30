import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";

import { assertGolden, assertGoldenJson } from "../index.js";

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "riebeckite-test-golden-"),
);

after(() => {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

function goldenUrl(name: string): URL {
  return pathToFileURL(path.join(temporaryRoot, name));
}

/**
 * Run `body` with `UPDATE_GOLDEN` forced to `value`, then restore the previous
 * setting so the suite behaves the same under `pnpm test` and
 * `pnpm test:update`.
 */
function withUpdateMode(value: string | undefined, body: () => void): void {
  const previous = process.env.UPDATE_GOLDEN;
  if (value === undefined) delete process.env.UPDATE_GOLDEN;
  else process.env.UPDATE_GOLDEN = value;
  try {
    body();
  } finally {
    if (previous === undefined) delete process.env.UPDATE_GOLDEN;
    else process.env.UPDATE_GOLDEN = previous;
  }
}

test("matches a recorded golden file", () => {
  withUpdateMode(undefined, () => {
    const url = goldenUrl("match.txt");
    fs.writeFileSync(url, "hello\n", "utf8");
    assertGolden("hello", url);
  });
});

test("normalizes CRLF and trailing newlines by default", () => {
  withUpdateMode(undefined, () => {
    const url = goldenUrl("normalize.txt");
    fs.writeFileSync(url, "line1\r\nline2\n\n\n", "utf8");
    assertGolden("line1\nline2", url);
  });
});

test("preserves bytes when normalize is false", () => {
  withUpdateMode(undefined, () => {
    const url = goldenUrl("exact.txt");
    fs.writeFileSync(url, "raw", "utf8");
    assertGolden("raw", url, { normalize: false });
  });
});

test("fails when the golden file is missing", () => {
  withUpdateMode(undefined, () => {
    assert.throws(
      () => assertGolden("value", goldenUrl("missing.txt")),
      /Missing golden file/,
    );
  });
});

test("fails when the recorded value differs", () => {
  withUpdateMode(undefined, () => {
    const url = goldenUrl("mismatch.txt");
    fs.writeFileSync(url, "recorded\n", "utf8");
    assert.throws(() => assertGolden("actual", url), /Golden mismatch/);
  });
});

test("includes the message option in failures", () => {
  withUpdateMode(undefined, () => {
    assert.throws(
      () =>
        assertGolden("value", goldenUrl("message.txt"), {
          message: "table of contents",
        }),
      /table of contents: Missing golden file/,
    );
  });
});

test("writes the golden file when UPDATE_GOLDEN is 1", () => {
  const url = goldenUrl("write.txt");
  withUpdateMode("1", () => {
    assertGolden("written", url);
  });
  assert.equal(fs.readFileSync(url, "utf8"), "written\n");
});

test("serializes objects with two-space indentation", () => {
  const url = goldenUrl("json.json");
  withUpdateMode("1", () => {
    assertGoldenJson({ b: 1, a: [2, 3] }, url);
  });
  assert.equal(
    fs.readFileSync(url, "utf8"),
    `{\n  "b": 1,\n  "a": [\n    2,\n    3\n  ]\n}\n`,
  );
});
