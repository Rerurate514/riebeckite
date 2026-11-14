import path from "node:path";
import { repositoryRoot } from "./check_source_health_config.mjs";
import { toPosix } from "./check_source_health_files.mjs";

export function packageRootFor(file, root = repositoryRoot) {
  const relative = toPosix(path.relative(root, file));
  const parts = relative.split("/");
  if (parts[0] === "packages") {
    if (
      parts[1] === "plugins" ||
      parts[1] === "integrations" ||
      parts[1] === "themes"
    ) {
      return parts.length >= 3
        ? `${parts[0]}/${parts[1]}/${parts[2]}`
        : undefined;
    }
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : undefined;
  }
  if (parts[0] === "website") {
    return "website";
  }
  return undefined;
}

export function isPackageSpecifier(specifier) {
  return !specifier.startsWith(".") && !specifier.startsWith("/");
}

export function forbiddenCoreImport(specifier) {
  if (specifier === "hono" || specifier.startsWith("hono/")) return true;
  if (specifier === "honox" || specifier.startsWith("honox/")) return true;
  if (specifier === "vite" || specifier.startsWith("vite/")) return true;
  return (
    specifier === "@riebeckite/honox" ||
    specifier.startsWith("@riebeckite/honox/") ||
    specifier.startsWith("@riebeckite/plugin-") ||
    specifier.startsWith("@riebeckite/theme-") ||
    specifier === "@riebeckite/cli" ||
    specifier.startsWith("@riebeckite/cli/") ||
    specifier === "@riebeckite/ui" ||
    specifier.startsWith("@riebeckite/ui/")
  );
}

export function forbiddenPluginImport(specifier) {
  return (
    specifier === "@riebeckite/honox" ||
    specifier.startsWith("@riebeckite/honox/") ||
    specifier === "@riebeckite/cli" ||
    specifier.startsWith("@riebeckite/cli/")
  );
}

export function forbiddenIntegrationImport(specifier) {
  return (
    specifier === "@riebeckite/cli" ||
    specifier.startsWith("@riebeckite/cli/") ||
    specifier === "@riebeckite/web"
  );
}

export function forbiddenThemeImport(specifier) {
  if (!specifier.startsWith("@riebeckite/")) return false;
  return specifier !== "@riebeckite/core";
}

export function isBrowserFile(relative) {
  return (
    /(^|\/)(client|browser)(\/|\.)/i.test(relative) ||
    /\.(client|browser)\.[^/]+$/i.test(relative) ||
    /(^|\/)worker\.[^/]+$/i.test(relative)
  );
}

export function nodeBuiltinSpecifier(specifier) {
  if (specifier === "fs" || specifier === "path" || specifier === "os") {
    return true;
  }
  return specifier.startsWith("node:");
}

export function forbiddenBrowserImport(specifier) {
  return (
    nodeBuiltinSpecifier(specifier) ||
    specifier === "@riebeckite/node" ||
    specifier.startsWith("@riebeckite/node/") ||
    specifier === "@riebeckite/cli" ||
    specifier.startsWith("@riebeckite/cli/") ||
    specifier === "@riebeckite/preview" ||
    specifier.startsWith("@riebeckite/preview/")
  );
}
