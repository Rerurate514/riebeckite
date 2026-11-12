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
  "ux",
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
      const selector = node.arguments[6];
      if (!selector || selector.kind === ts.SyntaxKind.UndefinedKeyword) {
        errors.push(
          `${name}: createClientEntry must pass a presenceSelector as its seventh argument`,
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
