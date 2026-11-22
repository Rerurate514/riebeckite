import assert from "node:assert/strict";
import test from "node:test";
import {
  ConfigValidationError,
  defineConfig,
  type RiebeckiteConfig,
} from "@riebeckite/core";
import {
  createMutationPathPolicy,
  defineAiIntegration,
  getAiSetupFiles,
  resolveAiIntegration,
} from "../index.js";

test("augments integrations.ai with typed policy settings", () => {
  const config: RiebeckiteConfig = defineConfig({
    site: { title: "Site" },
    integrations: {
      ai: defineAiIntegration({
        mutationPolicy: { writable: ["notes/**"] },
      }),
    },
  });
  assert.equal(
    config.integrations?.ai?.mutationPolicy?.writable?.[0],
    "notes/**",
  );
});

test("resolves mutation policy defaults and protected paths", () => {
  const policy = createMutationPathPolicy(
    resolveAiIntegration({
      mutationPolicy: {
        writable: ["notes/**"],
        protected: ["notes/legal/**"],
      },
    }).mutationPolicy,
  );
  assert.equal(policy("notes/hello.md"), true);
  assert.equal(policy("notes/legal/notice.md"), false);
  assert.equal(policy("other/hello.md"), false);
  assert.equal(
    createMutationPathPolicy(resolveAiIntegration(undefined).mutationPolicy)(
      "any.md",
    ),
    true,
  );
});

test("rejects malformed mutation policy settings", () => {
  assert.throws(
    () => resolveAiIntegration({ mutationPolicy: { writable: [1] } }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.deepEqual(error.issues, [
        {
          path: "integrations.ai.mutationPolicy.writable[0]",
          message: "Expected a non-empty string.",
        },
      ]);
      return true;
    },
  );
});

test("selects and renders requested setup files", () => {
  const files = getAiSetupFiles(
    {
      name: "site",
      title: "Site",
      description: "",
      baseUrl: "https://example.com",
      locale: "en",
    },
    { lint: true, rules: true, skills: true, contentDirectory: "notes" },
    "0.1.0",
  );
  assert.match(
    files.find((file) => file.path === "RIEBECKITE_AI.md")?.content ?? "",
    /`notes\/`/,
  );
  assert.match(
    files.find(
      (file) => file.path === ".agents/skills/riebeckite-theme/SKILL.md",
    )?.content ?? "",
    /riebeckiteVersion: "0\.1\.0"/,
  );
  assert.deepEqual(
    getAiSetupFiles(
      {
        name: "site",
        title: "Site",
        description: "",
        baseUrl: "",
        locale: "en",
      },
      { skills: false },
    ),
    [],
  );
});
