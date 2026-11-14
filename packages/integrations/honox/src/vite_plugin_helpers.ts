import path from "node:path";

export type RiebeckiteIntegrationOptions = {
  configRoot?: string;
  workspaceRoot?: string;
  appRoot?: string;
  configFile?: string;
  bridgeToken?: string;
};

export const defaultSsrExternals = [
  "hono",
  "hono/html",
  "hono/jsx",
  "hono/jsx/jsx-runtime",
  "extend",
  "debug",
  "node:fs/promises",
  "node:path",
  "parse-numeric-range",
  "slugify",
  "vfile-matter",
  "yaml",
] as const;

export function isBareImport(source: string): boolean {
  return (
    !source.startsWith(".") &&
    !path.isAbsolute(source) &&
    !source.startsWith("\0") &&
    !source.startsWith("node:")
  );
}

export function isInDirectory(filePath: string, directory: string): boolean {
  const relative = path.relative(directory, filePath);
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}

export async function callPluginHook(
  hook: unknown,
  context: unknown,
  ...arguments_: unknown[]
): Promise<unknown> {
  const handler =
    typeof hook === "function"
      ? hook
      : typeof hook === "object" && hook !== null && "handler" in hook
        ? hook.handler
        : undefined;
  return typeof handler === "function"
    ? handler.call(context, ...arguments_)
    : undefined;
}

export function callPluginHookSynchronously(
  hook: unknown,
  context: unknown,
): unknown {
  const handler =
    typeof hook === "function"
      ? hook
      : typeof hook === "object" && hook !== null && "handler" in hook
        ? hook.handler
        : undefined;
  return typeof handler === "function"
    ? handler.call(context, context)
    : undefined;
}
