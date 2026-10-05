import assert from "node:assert/strict";
import { test } from "node:test";
import {
  renderApplicationInspection,
  renderBuildInspection,
  renderConfigInspection,
  renderContentInspection,
} from "../src/inspect/renderer.js";
import type {
  ApplicationInspection,
  BuildInspection,
  ConfigInspection,
  ContentInspection,
} from "../src/inspect/types.js";

const config: ConfigInspection = {
  site: { title: "Site", baseUrl: "https://example.com", locale: "ja" },
  content: {
    source: "filesystem",
    directory: "../../docs",
    exclude: ["agents/**", "**/private/**"],
    publishStrategy: "selective",
  },
  cache: {
    enabled: true,
    directory: ".riebeckite/cache",
    persistentCache: { cacheable: false, reason: "l10n plugin is enabled" },
  },
  theme: { name: "default", colorMode: "auto" },
  pluginCount: 3,
};

test("inspect config lists exclude patterns and persistent cache bypass reason", () => {
  const output = renderConfigInspection(config);
  assert.match(output, /Exclude\s+agents\/\*\*, \*\*\/private\/\*\*/);
  assert.match(output, /Enabled\s+yes/);
  assert.match(output, /Directory\s+\.riebeckite\/cache/);
  assert.match(output, /Content\s+bypassed/);
  assert.match(output, /Reason\s+l10n plugin is enabled/);
});

test("inspect config reports a cacheable persistent cache without a reason", () => {
  const output = renderConfigInspection({
    ...config,
    cache: {
      enabled: true,
      directory: "",
      persistentCache: { cacheable: true },
    },
  });
  assert.match(output, /Directory\s+\(default\)/);
  assert.match(output, /Content\s+cacheable/);
  assert.doesNotMatch(output, /Reason/);
});

test("inspect config reports no excludes as a dash", () => {
  const output = renderConfigInspection({
    ...config,
    content: { ...config.content, exclude: [] },
  });
  assert.match(output, /Exclude\s+-/);
});

const content: ContentInspection = {
  source: "filesystem",
  entryCount: 2,
  excluded: [
    { path: "drafts", pattern: "drafts/**" },
    { path: "private/secret.md", pattern: "**/private/**" },
  ],
  extensions: [{ extension: ".md", count: 2 }],
  paths: [{ path: "index.md" }],
};

test("inspect content reports excluded count and reasons in list mode", () => {
  const output = renderContentInspection(content, { list: true });
  assert.match(output, /Excluded\s+2/);
  assert.match(output, /EXCLUDED PATH {2}PATTERN/);
  assert.match(output, /drafts\s+drafts\/\*\*/);
  assert.match(output, /private\/secret\.md\s+\*\*\/private\/\*\*/);
});

test("inspect content hides exclusion details outside list mode", () => {
  const output = renderContentInspection(content, { list: false });
  assert.match(output, /Excluded\s+2/);
  assert.doesNotMatch(output, /EXCLUDED PATH/);
});

const validBuild: BuildInspection = {
  status: "valid",
  version: 8,
  entryCount: 12,
  reusable: true,
};

test("inspect build reports whether the state is reusable", () => {
  assert.match(renderBuildInspection(validBuild), /Reusable\s+yes/);
  assert.match(
    renderBuildInspection({ ...validBuild, reusable: false }),
    /Reusable\s+no/,
  );
});

test("inspect build reports the invalid reason", () => {
  const output = renderBuildInspection({
    status: "invalid",
    reason: "malformed-json",
  });
  assert.match(output, /Status\s+invalid/);
  assert.match(output, /Reason\s+state file is not valid JSON/);
});

test("inspect application overview includes build reuse", () => {
  const inspection: ApplicationInspection = {
    root: ".",
    configPath: "riebeckite.config.ts",
    content: { source: "filesystem", entryCount: 2 },
    plugins: { enabledCount: 3, capabilityCount: 4 },
    build: validBuild,
  };
  const output = renderApplicationInspection(inspection);
  assert.match(output, /State\s+valid/);
  assert.match(output, /Reusable\s+yes/);
});
