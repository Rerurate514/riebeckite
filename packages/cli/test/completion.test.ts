import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateCompletion } from "@riebeckite/core/cli";
import { createBuiltinRegistry } from "../src/command/builtins.js";

const registry = createBuiltinRegistry();

function quotePowerShell(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

test("completion covers nested commands, options, enums, and JSON", () => {
  const bash = generateCompletion(registry, "bash");
  assert.match(bash, /publish plan/);
  assert.match(bash, /--provider/);
  assert.match(bash, /github-pages/);
  assert.match(bash, /doctor/);
  assert.match(bash, /--json/);
  assert.match(bash, /--no-open/);

  const zsh = generateCompletion(registry, "zsh");
  assert.match(zsh, /#compdef riebeckite/);
  assert.match(zsh, /'publish'\)/);
  assert.match(zsh, /'publish plan'\)/);
  assert.match(zsh, /theme:Preview a local Theme/);

  const powershell = generateCompletion(registry, "powershell");
  assert.match(powershell, /Register-ArgumentCompleter -Native/);
  assert.match(powershell, /'publish plan'/);
  assert.match(powershell, /'--provider'/);
});

test("completion rejects unsafe command names", () => {
  const script = generateCompletion(registry, "bash", "riebeckite;rm -rf /");
  assert.match(script, /_riebeckite_completion/);
  assert.doesNotMatch(script, /rm -rf/);
});

test("bash completion parses", () => {
  const script = generateCompletion(registry, "bash");
  const result = spawnSync("bash", ["-n"], {
    input: script,
    encoding: "utf8",
  });
  if (result.error) return;
  assert.equal(result.status, 0, result.stderr);
});

test("PowerShell completion parses", () => {
  const script = generateCompletion(registry, "powershell");
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-completion-")),
    "completion.ps1",
  );
  fs.writeFileSync(file, script, "utf8");
  try {
    const command = `$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseFile(${quotePowerShell(file)},[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count -gt 0){$errors|ForEach-Object{$_.Message};exit 1}`;
    const shell = process.platform === "win32" ? "powershell" : "pwsh";
    const result = spawnSync(shell, ["-NoProfile", "-Command", command], {
      encoding: "utf8",
    });
    if (result.error) return;
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
  }
});
