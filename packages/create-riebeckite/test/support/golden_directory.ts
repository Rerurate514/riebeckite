import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const TEXT_SNIFF_LIMIT = 1 << 16;

export function assertGoldenDirectory(
  actualDirectory: string,
  goldenDirectory: string,
  label = "golden directory",
): void {
  const actual = collectFiles(actualDirectory);

  if (process.env.UPDATE_GOLDEN === "1") {
    fs.rmSync(goldenDirectory, { recursive: true, force: true });
    for (const [relativePath, bytes] of actual) {
      const target = path.join(goldenDirectory, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, bytes);
    }
    return;
  }

  assert.ok(
    fs.existsSync(goldenDirectory),
    `${label}: missing golden directory ${goldenDirectory}. ` +
      "Run `pnpm test:update` to create it.",
  );

  const golden = collectFiles(goldenDirectory);
  const problems: string[] = [];

  for (const relativePath of [...golden.keys()].sort()) {
    if (!actual.has(relativePath)) {
      problems.push(`missing file: ${relativePath}`);
    }
  }
  for (const relativePath of [...actual.keys()].sort()) {
    if (!golden.has(relativePath)) {
      problems.push(`unexpected file: ${relativePath}`);
    }
  }
  for (const relativePath of [...actual.keys()].sort()) {
    const expected = golden.get(relativePath);
    const observed = actual.get(relativePath);
    if (!expected || !observed || expected.equals(observed)) continue;
    problems.push(describeDifference(relativePath, expected, observed));
  }

  assert.equal(
    problems.length,
    0,
    `${label}: generated output does not match ${goldenDirectory}.\n` +
      `${problems.join("\n")}\n` +
      "Review the change, then run `pnpm test:update` to accept it.",
  );
}

function collectFiles(root: string): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const relativePath = path
          .relative(root, full)
          .split(path.sep)
          .join("/");
        files.set(relativePath, fs.readFileSync(full));
      }
    }
  };
  if (fs.existsSync(root)) walk(root);
  return files;
}

function describeDifference(
  relativePath: string,
  expected: Buffer,
  observed: Buffer,
): string {
  const size = `expected ${expected.length} bytes, found ${observed.length}`;
  if (!isText(expected) || !isText(observed)) {
    return `changed binary file: ${relativePath} (${size})`;
  }
  return `changed file: ${relativePath} (${size})${firstLineDifference(expected, observed)}`;
}

function isText(bytes: Buffer): boolean {
  return bytes.length <= TEXT_SNIFF_LIMIT && !bytes.includes(0);
}

function firstLineDifference(expected: Buffer, observed: Buffer): string {
  const expectedLines = expected.toString("utf8").split("\n");
  const observedLines = observed.toString("utf8").split("\n");
  const count = Math.max(expectedLines.length, observedLines.length);
  for (let index = 0; index < count; index += 1) {
    const left = expectedLines[index];
    const right = observedLines[index];
    if (left === right) continue;
    return (
      `\n    first difference at line ${index + 1}` +
      `\n      golden: ${truncate(left)}` +
      `\n      actual: ${truncate(right)}`
    );
  }
  return "";
}

function truncate(value: string | undefined): string {
  const text = value ?? "<end of file>";
  return text.length > 200 ? `${text.slice(0, 200)}...` : text;
}
