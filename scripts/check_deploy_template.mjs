import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const templateRoot = path.join(repositoryRoot, "templates", "cloudflare");

function stripJsonComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function readJsonc(file) {
  return JSON.parse(stripJsonComments(fs.readFileSync(file, "utf8")));
}

const errors = [];

function expect(condition, message) {
  if (!condition) errors.push(message);
}

const configPath = path.join(templateRoot, "wrangler.jsonc");
const workflowPath = path.join(
  templateRoot,
  ".github",
  "workflows",
  "deploy.yml",
);
const referenceConfigPath = path.join(
  repositoryRoot,
  "apps",
  "web",
  "wrangler.jsonc",
);

expect(
  fs.existsSync(configPath),
  "templates/cloudflare/wrangler.jsonc is missing",
);
expect(
  fs.existsSync(workflowPath),
  "templates/cloudflare/.github/workflows/deploy.yml is missing",
);
expect(
  fs.existsSync(referenceConfigPath),
  "apps/web/wrangler.jsonc is missing (reference config)",
);

if (errors.length === 0) {
  const config = readJsonc(configPath);
  const reference = readJsonc(referenceConfigPath);

  expect(
    typeof config.name === "string" && config.name.length > 0,
    "wrangler.jsonc must set a Worker name",
  );
  expect(
    typeof config.compatibility_date === "string",
    "wrangler.jsonc must set compatibility_date",
  );
  expect(
    Array.isArray(config.compatibility_flags) &&
      config.compatibility_flags.includes("nodejs_compat"),
    'wrangler.jsonc must enable the "nodejs_compat" flag',
  );
  expect(
    config.assets?.directory === "./dist",
    'wrangler.jsonc assets.directory must be "./dist"',
  );
  expect(
    config.main === undefined,
    "wrangler.jsonc must not set main (static-assets deployment)",
  );

  const templateKeys = Object.keys(config).sort();
  const referenceKeys = Object.keys(reference).sort();
  expect(
    JSON.stringify(templateKeys) === JSON.stringify(referenceKeys),
    `wrangler.jsonc keys must match apps/web/wrangler.jsonc (${JSON.stringify(
      referenceKeys,
    )}), received ${JSON.stringify(templateKeys)}`,
  );

  const workflow = fs.readFileSync(workflowPath, "utf8");
  for (const needle of [
    "cloudflare/wrangler-action@",
    "secrets.CLOUDFLARE_API_TOKEN",
    "secrets.CLOUDFLARE_ACCOUNT_ID",
    "pnpm install",
    "pnpm run build",
    "workflow_dispatch",
  ]) {
    expect(
      workflow.includes(needle),
      `deploy.yml must reference ${needle}`,
    );
  }
}

if (errors.length > 0) {
  console.error(`Deploy template validation failed (${errors.length} error(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Cloudflare deploy template validated against apps/web.");
}
