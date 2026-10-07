import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

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

const TEMPLATE_GITIGNORE_ENTRIES = ["node_modules/", ".wrangler/", ".dev.vars"];

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
  const gitignorePath = path.join(
    analyticsTemplateRoot,
    template.directory,
    ".gitignore",
  );
  expect(fs.existsSync(configPath), `${name}/wrangler.jsonc is missing`);
  expect(fs.existsSync(readmePath), `${name}/README.md is missing`);
  expect(fs.existsSync(gitignorePath), `${name}/.gitignore is missing`);
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
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, "utf8");
    for (const entry of TEMPLATE_GITIGNORE_ENTRIES) {
      expect(
        gitignore.includes(entry),
        `${name}/.gitignore must ignore ${entry}`,
      );
    }
  }
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

if (errors.length > 0) {
  console.error(
    `Deploy template validation failed (${errors.length} error(s)):`,
  );
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Analytics Cloudflare Worker templates validated.");
}
