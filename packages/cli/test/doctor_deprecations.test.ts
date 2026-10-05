import assert from "node:assert/strict";
import test from "node:test";
import type { Diagnostic, ResolvedRiebeckiteConfig } from "@riebeckite/core";
import { checkDeprecations } from "../src/doctor/checks/deprecations.js";
import { renderDoctorResults } from "../src/doctor/renderer.js";

const config = {
  site: {
    title: "Test",
    description: "",
    author: "",
    baseUrl: "",
    locale: "en",
    twitterSite: "",
    defaultOgImage: "",
    feed: { title: "Test", description: "", language: "en" },
  },
  content: {
    directory: "content",
    exclude: [],
    filters: { publishStrategy: "explicit" },
  },
  theme: {
    name: "riebeckite",
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    tokens: {},
    attributes: {},
    userCss: [],
    styles: [],
  },
  plugins: [],
  cache: { enabled: true, directory: ".riebeckite/cache" },
} satisfies ResolvedRiebeckiteConfig;

test("doctor deprecation check renders warnings without making the result an error", () => {
  const diagnostic: Diagnostic = {
    code: "deprecated-config",
    severity: "warning",
    target: "site.legacyTitle",
    message: [
      "Deprecated: site.legacyTitle",
      "Use: site.title",
      "Deprecated since: 0.0.13",
      "See: docs/en/guides/upgrading.md#legacy-site-title",
    ].join("\n"),
    suggestion: "Use site.title. Move the value to site.title.",
  };

  const result = checkDeprecations(config, [diagnostic]);
  const output = renderDoctorResults([result]);

  assert.equal(result.status, "warning");
  assert.match(output, /Deprecated usage/);
  assert.match(output, /⚠ 1 deprecated usage warning\(s\)\./);
  assert.match(output, /Deprecated: site\.legacyTitle/);
  assert.match(output, /Use: site\.title/);
  assert.match(output, /See: docs\/en\/guides\/upgrading\.md/);
  assert.match(output, /Summary\n1 warnings\n0 errors/);
});

test("doctor deprecation check is ok when no deprecated usage is detected", () => {
  const result = checkDeprecations(config, []);

  assert.equal(result.status, "ok");
  assert.equal(result.message, "No deprecated usage detected.");
});
