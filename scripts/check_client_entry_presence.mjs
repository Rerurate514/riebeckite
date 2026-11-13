import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const pluginRoot = path.resolve(
  import.meta.dirname,
  "..",
  "packages",
  "plugins",
);
const globalEntries = new Set([
  "analytics",
  "color-mode",
  "text-fragment",
  "toc",
  "ux",
]);
const selectorNoise = new Set([
  "a",
  "button",
  "details",
  "div",
  "false",
  "figure",
  "input",
  "nav",
  "pending",
  "script",
  "span",
  "true",
]);
const errors = [];

for (const name of fs.readdirSync(pluginRoot)) {
  const file = path.join(pluginRoot, name, "index.ts");
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "createClientEntry" &&
      !globalEntries.has(name)
    ) {
      const options = node.arguments[1];
      const property =
        options && ts.isObjectLiteralExpression(options)
          ? options.properties.find(
              (candidate) =>
                ts.isPropertyAssignment(candidate) &&
                propertyName(candidate.name) === "presenceSelector",
            )
          : undefined;
      const selector = property?.initializer;
      if (!selector || selector.kind === ts.SyntaxKind.UndefinedKeyword) {
        errors.push(
          `${name}: createClientEntry options must set a presenceSelector`,
        );
      } else if (ts.isStringLiteral(selector)) {
        const tokens = selector.text
          .replace(/[["'\]=\s]/g, " ")
          .split(/\s+/)
          .filter(
            (token) =>
              token.length > 0 &&
              /^[a-z0-9-]+$/.test(token) &&
              !selectorNoise.has(token),
          );
        const pluginSource = readPluginSource(path.join(pluginRoot, name));
        for (const token of tokens) {
          const camelCase = token.replace(/-([a-z])/g, (_, letter) =>
            letter.toUpperCase(),
          );
          if (
            !pluginSource.includes(token) &&
            !pluginSource.includes(camelCase)
          ) {
            errors.push(
              `${name}: presenceSelector "${selector.text}" references "${token}", which the plugin does not render`,
            );
          }
        }
      } else {
        errors.push(
          `${name}: the presenceSelector must be a string literal so it can be validated`,
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  sourceFile.forEachChild(visit);
}

if (errors.length > 0) {
  console.error("Client entry presence validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Client entry presence selectors validated.");
}

function propertyName(name) {
  return ts.isIdentifier(name) || ts.isStringLiteral(name)
    ? name.text
    : undefined;
}

function readPluginSource(directory) {
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        walk(target);
      } else if (
        entry.name.endsWith(".ts") ||
        entry.name.endsWith(".tsx") ||
        entry.name.endsWith(".css")
      ) {
        files.push(target);
      }
    }
  };
  walk(directory);
  return files
    .filter((file) => path.basename(file) !== "index.ts")
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}
