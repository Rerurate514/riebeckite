import { createRequire } from "node:module";
import path from "node:path";
import type { InspectorTabSnapshot } from "@riebeckite/core";
import { isPathInsideDirectory } from "@riebeckite/node";
import type { ResolvedInspectorApplication } from "./application.js";

export function inspectorTabMetadata(tab: InspectorTabSnapshot) {
  return {
    id: tab.id,
    plugin: tab.plugin,
    title: tab.title,
    description: tab.description,
    order: tab.order,
    hasClient: tab.client !== undefined,
    hasData: tab.data !== undefined,
    error: tab.error,
  };
}

export function resolveInspectorClientUrl(
  appRoot: string,
  specifier: string,
): { url?: string; error?: string } {
  try {
    const require = createRequire(path.join(appRoot, "package.json"));
    const resolved = require.resolve(specifier);
    if (!path.isAbsolute(resolved)) {
      throw new Error(`Inspector client "${specifier}" is not a file.`);
    }
    return {
      url: encodeURI(`/@fs/${resolved.replace(/\\/g, "/")}`),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function shouldInvalidateInspection(
  application: ResolvedInspectorApplication | undefined,
  file: string,
): boolean {
  if (!application) return true;
  return (
    !isPathInsideDirectory(application.appRoot, file) ||
    isPathInsideDirectory(application.contentRoot, file) ||
    file === application.configFile
  );
}
