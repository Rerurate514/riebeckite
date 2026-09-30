import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Dependency-free golden assertion for `node:test`.
 *
 * Node's built-in snapshot assertion (`t.assert.snapshot`) needs Node 22.3+,
 * but Riebeckite supports Node 20.19+, so tests record expected output as
 * committed golden files and compare against them here instead.
 *
 * A missing golden file fails the test. Run `pnpm test:update` at the
 * repository root (or set `UPDATE_GOLDEN=1` for a single package) to write the
 * current output.
 */

export interface GoldenOptions {
  /**
   * Normalize CRLF/CR to LF and collapse trailing newlines to one. Defaults to
   * true so golden files stay stable across platforms and editors.
   */
  normalize?: boolean;
  /** Extra context shown when the assertion fails. */
  message?: string;
}

function normalizeText(value: string): string {
  return `${value.replace(/\r\n?/g, "\n").replace(/\n+$/, "")}\n`;
}

function relative(file: string): string {
  return path.relative(process.cwd(), file) || file;
}

export function assertGolden(
  actual: string,
  golden: URL,
  options: GoldenOptions = {},
): void {
  const normalize = options.normalize ?? true;
  const value = normalize ? normalizeText(actual) : actual;
  const file = fileURLToPath(golden);
  const label = options.message ? `${options.message}: ` : "";

  if (process.env.UPDATE_GOLDEN === "1") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value, "utf8");
    return;
  }

  assert.ok(
    fs.existsSync(file),
    `${label}Missing golden file ${relative(file)}. ` +
      "Run `pnpm test:update` to create it.",
  );

  const recorded = fs.readFileSync(file, "utf8");
  assert.equal(
    value,
    normalize ? normalizeText(recorded) : recorded,
    `${label}Golden mismatch for ${relative(file)}. ` +
      "Run `pnpm test:update` to accept the new output.",
  );
}

export function assertGoldenJson(
  value: unknown,
  golden: URL,
  options: GoldenOptions = {},
): void {
  assertGolden(JSON.stringify(value, null, 2), golden, options);
}
