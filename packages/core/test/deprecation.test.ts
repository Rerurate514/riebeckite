import assert from "node:assert/strict";
import test from "node:test";
import {
  type ConfigDeprecationNotice,
  collectConfigDeprecationDiagnostics,
  createDeprecationDiagnostic,
  type DeprecationNotice,
} from "../index.js";

test("createDeprecationDiagnostic includes machine-readable metadata", () => {
  const notice: DeprecationNotice = {
    kind: "plugin-api",
    id: "plugin-old-hook",
    target: "plugin.oldHook",
    deprecatedSince: "0.0.13",
    replacement: "plugin.setup",
    action: "Move hook logic to setup().",
    documentationUrl: "docs/docs/guides/upgrading.en.md#plugin-old-hook",
    removedIn: "0.2.0",
  };

  const diagnostic = createDeprecationDiagnostic(notice);

  assert.equal(diagnostic.code, "deprecated-plugin-api");
  assert.equal(diagnostic.severity, "warning");
  assert.equal(diagnostic.target, "plugin.oldHook");
  assert.equal(diagnostic.meta?.deprecation, notice);
  assert.match(diagnostic.message, /Deprecated: plugin\.oldHook/);
  assert.match(diagnostic.message, /Use: plugin\.setup/);
  assert.match(diagnostic.message, /Removal planned: 0\.2\.0/);
  assert.match(diagnostic.suggestion ?? "", /Move hook logic to setup\(\)\./);
});

test("createDeprecationDiagnostic supports notices without replacement or removal version", () => {
  const diagnostic = createDeprecationDiagnostic({
    kind: "theme-api",
    id: "legacy-theme-token",
    target: "theme token --legacy",
    deprecatedSince: "0.0.13",
    action: "Remove the token and rely on the default theme token set.",
  });

  assert.match(diagnostic.message, /Deprecated: theme token --legacy/);
  assert.doesNotMatch(diagnostic.message, /Use:/);
  assert.doesNotMatch(diagnostic.message, /Removal planned:/);
});

test("collectConfigDeprecationDiagnostics reports matching deprecated config fields only", () => {
  const notices: readonly ConfigDeprecationNotice[] = [
    {
      kind: "config",
      id: "legacy-site-title",
      path: "site.legacyTitle",
      target: "site.legacyTitle",
      deprecatedSince: "0.0.13",
      replacement: "site.title",
      action: "Move the value to site.title.",
      documentationUrl: "docs/docs/guides/upgrading.en.md#legacy-site-title",
    },
    {
      kind: "config",
      id: "missing-field",
      path: "site.missing",
      target: "site.missing",
      deprecatedSince: "0.0.13",
      action: "Remove the field.",
    },
  ];

  const diagnostics = collectConfigDeprecationDiagnostics(
    { site: { title: "Test", legacyTitle: "Old" } } as never,
    notices,
  );

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, "deprecated-config");
  assert.equal(diagnostics[0].target, "site.legacyTitle");
  assert.match(diagnostics[0].message, /Use: site\.title/);
  assert.match(
    diagnostics[0].message,
    /See: docs\/docs\/guides\/upgrading\.en\.md/,
  );
});
