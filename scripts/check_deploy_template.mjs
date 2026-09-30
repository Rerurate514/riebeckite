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

const analyticsTemplateRoot = path.join(
  repositoryRoot,
  "templates",
  "analytics-cloudflare",
);
const analyticsPackageRoot = path.join(
  repositoryRoot,
  "packages",
  "integrations",
  "analytics-cloudflare",
);
const analyticsTemplates = [
  {
    directory: "d1",
    binding: "ANALYTICS_DB",
    adapter: "D1AnalyticsStorage",
    storageKind: "d1_databases",
    idPath: ["database_name", "database_id"],
  },
  {
    directory: "kv",
    binding: "ANALYTICS_KV",
    adapter: "KvAnalyticsStorage",
    storageKind: "kv_namespaces",
    idPath: ["id"],
  },
];

function readWorkerSource(directory) {
  return fs.readFileSync(
    path.join(analyticsTemplateRoot, directory, "src", "worker.ts"),
    "utf8",
  );
}

for (const template of analyticsTemplates) {
  const name = `analytics-cloudflare/${template.directory}`;
  const configPath = path.join(
    analyticsTemplateRoot,
    template.directory,
    "wrangler.jsonc",
  );
  const readmePath = path.join(
    analyticsTemplateRoot,
    template.directory,
    "README.md",
  );
  expect(fs.existsSync(configPath), `${name}/wrangler.jsonc is missing`);
  expect(fs.existsSync(readmePath), `${name}/README.md is missing`);
  expect(
    fs.existsSync(
      path.join(analyticsTemplateRoot, template.directory, "src", "worker.ts"),
    ),
    `${name}/src/worker.ts is missing`,
  );

  if (errors.length > 0 && !fs.existsSync(configPath)) continue;

  const config = readJsonc(configPath);
  expect(
    typeof config.name === "string" && config.name.length > 0,
    `${name}/wrangler.jsonc must set a Worker name`,
  );
  expect(
    config.main === "src/worker.ts",
    `${name}/wrangler.jsonc must point main at src/worker.ts`,
  );
  expect(
    typeof config.compatibility_date === "string",
    `${name}/wrangler.jsonc must set compatibility_date`,
  );
  expect(
    config.assets === undefined,
    `${name}/wrangler.jsonc must not declare static assets`,
  );
  const storage = config[template.storageKind];
  expect(
    Array.isArray(storage) && storage.length === 1,
    `${name}/wrangler.jsonc must configure exactly one ${template.storageKind} binding`,
  );
  const binding = storage?.[0];
  expect(
    binding?.binding === template.binding,
    `${name}/wrangler.jsonc binding must be ${template.binding}`,
  );
  for (const key of template.idPath) {
    expect(
      typeof binding?.[key] === "string" && (binding?.[key] ?? "").length > 0,
      `${name}/wrangler.jsonc ${template.storageKind}[0].${key} must be set`,
    );
  }
  const workerSource = readWorkerSource(template.directory);
  expect(
    workerSource.includes("createWorker") &&
      workerSource.includes(`new ${template.adapter}(env.${template.binding})`),
    `${name}/src/worker.ts must build ${template.adapter} from the ${template.binding} binding`,
  );
  const readme = fs.readFileSync(readmePath, "utf8");
  expect(
    readme.includes("separate") || readme.includes("独立"),
    `${name}/README.md must describe this as a separate Worker deployment`,
  );
}

const migrationPath = path.join(
  analyticsPackageRoot,
  "migrations",
  "0001_analytics_page_views.sql",
);
expect(
  fs.existsSync(migrationPath),
  "packages/integrations/analytics-cloudflare/migrations/0001_analytics_page_views.sql is missing",
);

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
    "npm ci",
    "npm exec riebeckite check",
    "npm exec riebeckite build",
    "workflow_dispatch",
  ]) {
    expect(workflow.includes(needle), `deploy.yml must reference ${needle}`);
  }
}

if (errors.length > 0) {
  console.error(
    `Deploy template validation failed (${errors.length} error(s)):`,
  );
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    "Cloudflare static-assets template validated against apps/web; analytics Worker templates validated.",
  );
}
