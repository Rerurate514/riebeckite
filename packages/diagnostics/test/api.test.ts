import assert from "node:assert/strict";
import test from "node:test";
import {
  attachApiLifecycleConfigSource,
  defineApiLifecycle,
} from "@riebeckite/core";
import {
  collectApiLifecycleDiagnostics,
  sortDevelopmentDiagnostics,
} from "../index.js";

const deprecatedOption = defineApiLifecycle({
  id: "@riebeckite/plugin-docs#legacyMode",
  kind: "plugin-option",
  status: "deprecated",
  package: "@riebeckite/plugin-docs",
  deprecatedSince: "0.2.0",
  removalVersion: "0.4.0",
  replacement: "@riebeckite/plugin-docs#mode",
  reason: "The legacy mode is no longer supported.",
  migrationGuide: "Use the mode option.",
  pluginOption: { plugin: "docs", option: "legacyMode" },
});

function configWith(options: unknown, apiLifecycle = [deprecatedOption]) {
  return {
    content: { directory: "content" },
    plugins: [{ name: "docs", options, apiLifecycle }],
    theme: { styles: [] },
  } as never;
}

test("deprecated plugin options produce one warning with migration details", () => {
  const diagnostics = collectApiLifecycleDiagnostics(
    configWith({ legacyMode: true }),
  );

  assert.equal(diagnostics.length, 1);
  const [diagnostic] = diagnostics;
  assert.equal(diagnostic.code, "RB-API-001");
  assert.equal(diagnostic.category, "api");
  assert.equal(diagnostic.severity, "warning");
  assert.equal(diagnostic.subject.kind, "api");
  assert.equal(diagnostic.subject.value, deprecatedOption.id);
  assert.equal(diagnostic.plugin, "docs");
  assert.equal(diagnostic.cause, deprecatedOption.reason);
  assert.match(diagnostic.details ?? "", /Replacement: .*#mode/);
  assert.match(diagnostic.details ?? "", /Removal: 0\.4\.0/);
  assert.match(
    diagnostic.details ?? "",
    /Migration guide: Use the mode option\./,
  );
  assert.match(diagnostic.message, /plugin option "legacyMode"/);
});

test("unused deprecated APIs and stable APIs produce no diagnostics", () => {
  assert.deepEqual(collectApiLifecycleDiagnostics(configWith({})), []);
  assert.deepEqual(
    collectApiLifecycleDiagnostics(
      configWith({}, [
        defineApiLifecycle({
          id: "@riebeckite/core#stable",
          kind: "function",
          status: "stable",
        }),
      ]),
    ),
    [],
  );
});

test("raw configuration keys are detected after resolution", () => {
  const definition = defineApiLifecycle({
    id: "@riebeckite/core#cache.legacy",
    kind: "config-key",
    status: "deprecated",
    deprecatedSince: "0.2.0",
    reason: "The key is ignored.",
    configPath: "cache.legacy",
  });
  const config = configWith({}, [definition]);
  attachApiLifecycleConfigSource(config, { cache: { legacy: true } });

  const diagnostics = collectApiLifecycleDiagnostics(config);
  assert.equal(diagnostics.length, 1);
  assert.match(diagnostics[0].message, /configuration key "cache\.legacy"/);

  attachApiLifecycleConfigSource(config, { cache: {} });
  assert.deepEqual(collectApiLifecycleDiagnostics(config), []);
});

test("invalid registry metadata is an error and deprecations stay warnings", () => {
  const config = configWith({ legacyMode: true }, [
    deprecatedOption,
    {
      id: "invalid",
      kind: "function",
      status: "stable",
    },
    deprecatedOption,
  ] as never);

  const diagnostics = sortDevelopmentDiagnostics(
    collectApiLifecycleDiagnostics(config),
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => [diagnostic.code, diagnostic.severity]),
    [
      ["RB-API-001", "warning"],
      ["RB-API-002", "error"],
      ["RB-API-002", "error"],
    ],
  );
  assert.equal(
    diagnostics.filter((diagnostic) => diagnostic.code === "RB-API-001").length,
    1,
  );
});

test("removal version is reported as unconfirmed when omitted", () => {
  const definition = defineApiLifecycle({
    id: "@riebeckite/core#unconfirmed",
    kind: "function",
    status: "deprecated",
    deprecatedSince: "0.2.0",
    reason: "No removal is scheduled.",
    configPath: "cache.legacy",
  });
  const config = configWith({}, [definition]);
  attachApiLifecycleConfigSource(config, { cache: { legacy: true } });

  const [diagnostic] = collectApiLifecycleDiagnostics(config);
  assert.match(diagnostic.details ?? "", /Removal: not confirmed/);
});
