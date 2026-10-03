import assert from "node:assert/strict";
import { test } from "node:test";
import { formatScaffoldNextSteps } from "../src/scaffold/next-steps.js";

test("next steps install, start the dev server, and point at the index page", () => {
  assert.equal(
    formatScaffoldNextSteps("my-site", { editFile: "content/index.md" }),
    [
      "Next steps:",
      "  cd my-site",
      "  npm install",
      "  npm exec riebeckite check",
      "  npm exec riebeckite dev",
      "  npm exec riebeckite build",
      "",
      "Then edit:",
      "  content/index.md",
      "",
      "Common first settings:",
      "  riebeckite.config.ts: site.title, site.baseUrl, content.directory",
    ].join("\n"),
  );
});

test("next steps omit cd when the site lives in the current directory", () => {
  assert.equal(
    formatScaffoldNextSteps("."),
    [
      "Next steps:",
      "  npm install",
      "  npm exec riebeckite check",
      "  npm exec riebeckite dev",
      "  npm exec riebeckite build",
    ].join("\n"),
  );
});

test("next steps skip the edit hint when the scaffold wrote no index page", () => {
  assert.equal(
    formatScaffoldNextSteps("my-site"),
    [
      "Next steps:",
      "  cd my-site",
      "  npm install",
      "  npm exec riebeckite check",
      "  npm exec riebeckite dev",
      "  npm exec riebeckite build",
    ].join("\n"),
  );
});

test("external content keeps the workflow copy instruction", () => {
  const output = formatScaffoldNextSteps("my-site", {
    externalContent: true,
  });
  assert.ok(!output.includes("Then edit:"));
  assert.ok(
    output.includes(
      "Operational content lives in the content repository. CI checks it out to content/.",
    ),
  );
  assert.ok(
    output.includes(
      "Copy github/notify-site.yml to the content repository as .github/workflows/notify-site.yml.",
    ),
  );
});
