import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export function toPosix(value) {
  return value.split(path.sep).join("/");
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function walk(directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue;
      walk(full, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!sourceExtensions.has(path.extname(entry.name))) continue;
    files.push(full);
  }
  return files;
}

export function scriptKind(file) {
  if (file.endsWith(".tsx") || file.endsWith(".jsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".cjs")) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

export function packageName(specifier) {
  const segments = specifier.split("/");
  return specifier.startsWith("@")
    ? `${segments[0]}/${segments[1] ?? ""}`
    : segments[0];
}

export function subpathOf(specifier) {
  const name = packageName(specifier);
  return specifier.slice(name.length);
}

export function typesPackageName(name) {
  return name.startsWith("@")
    ? `@types/${name.slice(1).replace("/", "__")}`
    : `@types/${name}`;
}

export function declaredDependencies(manifest) {
  return new Set([
    manifest.name,
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ]);
}

export function isTypeOnlyImport(node) {
  if (ts.isImportDeclaration(node)) {
    if (node.importClause?.isTypeOnly) return true;
    const bindings = node.importClause?.namedBindings;
    if (
      bindings &&
      ts.isNamedImports(bindings) &&
      bindings.elements.length > 0
    ) {
      return bindings.elements.every((element) => element.isTypeOnly);
    }
    return false;
  }
  if (ts.isExportDeclaration(node)) return node.isTypeOnly;
  return false;
}

export function collectImports(file) {
  const text = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    toPosix(file),
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file),
  );
  const imports = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({
        specifier: node.moduleSpecifier.text,
        typeOnly: isTypeOnlyImport(node),
        position: node.getStart(sourceFile),
      });
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression
    ) {
      imports.push({
        specifier: node.moduleReference.expression.text,
        typeOnly: node.isTypeOnly,
        position: node.getStart(sourceFile),
      });
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push({
        specifier: node.arguments[0].text,
        typeOnly: false,
        position: node.getStart(sourceFile),
      });
    }
    ts.forEachChild(node, visit);
  };
  sourceFile.forEachChild(visit);
  return imports;
}

export function packageKind(pkg) {
  if (packageKinds.has(pkg.name)) return packageKinds.get(pkg.name);
  if (pkg.relative.startsWith("packages/plugins/")) return "plugin";
  if (pkg.relative.startsWith("packages/themes/")) return "theme";
  if (pkg.relative.startsWith("packages/integrations/")) return "integration";
  if (pkg.relative === "website") return "app";
  return "library";
}

export function isRiebeckitePackage(name) {
  return name.startsWith("@riebeckite/") || name === "create-riebeckite";
}

export function isIntentionalNonImport(ownerName, dependencyName) {
  return nonImportedDependencies.get(ownerName)?.has(dependencyName) ?? false;
}

export function isTestFile(relativeFile) {
  return (
    /(^|\/)(test|tests|__tests__|spec)(\/|$)/.test(relativeFile) ||
    /\.(test|spec)\.[^/]+$/.test(relativeFile)
  );
}

export function forbiddenDependency(kind, dependencyName, ownerName) {
  if (!isRiebeckitePackage(dependencyName)) return undefined;
  if (kind === "core") {
    return "Core must not depend on another Riebeckite package";
  }
  if (kind === "theme") {
    return dependencyName === "@riebeckite/core"
      ? undefined
      : "Themes may only depend on @riebeckite/core";
  }
  if (kind === "plugin") {
    if (
      dependencyName === "@riebeckite/cli" ||
      dependencyName === "@riebeckite/honox" ||
      dependencyName.startsWith("@riebeckite/honox-") ||
      dependencyName === "@riebeckite/preview"
    ) {
      return "Plugins must not depend on CLI, HonoX, or Preview packages";
    }
    if (dependencyName.startsWith("@riebeckite/theme-")) {
      return "Plugins must not depend on Themes";
    }
    if (
      dependencyName.startsWith("@riebeckite/plugin-") &&
      !allowedPluginDependencies.get(ownerName)?.has(dependencyName)
    ) {
      return `Plugin-to-Plugin dependency requires an allowed edge (${dependencyName})`;
    }
  }
  if (kind === "integration") {
    if (
      dependencyName === "@riebeckite/cli" ||
      dependencyName === "@riebeckite/web"
    ) {
      return "Integrations must not depend on the CLI or the application";
    }
    if (dependencyName.startsWith("@riebeckite/theme-")) {
      return "Integrations must not depend on Themes";
    }
  }
  return undefined;
}

export function exportsAllows(manifest, rawSubpath) {
  const exportsField = manifest.exports;
  if (exportsField === undefined) return true;
  const subpath = rawSubpath === "" ? "." : `.${rawSubpath}`;
  if (typeof exportsField === "string") return subpath === ".";
  if (subpath === ".") return "." in exportsField;
  for (const key of Object.keys(exportsField)) {
    if (key === subpath) return true;
    if (key.includes("*")) {
      const [prefix, suffix] = key.split("*");
      if (subpath.startsWith(prefix) && subpath.endsWith(suffix ?? "")) {
        return true;
      }
    }
  }
  return false;
}
