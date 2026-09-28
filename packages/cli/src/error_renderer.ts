export function renderCliError(error: unknown): string {
  return formatError(error, new Set());
}

function formatError(error: unknown, seen: Set<unknown>): string {
  if (!(error instanceof Error)) return String(error);
  if (seen.has(error)) return error.message;

  seen.add(error);
  const lines = [describe(error)];
  const code = readStringProperty(error, "code");
  const file =
    readStringProperty(error, "path") ??
    readStringProperty(error, "fileName") ??
    readStringProperty(error, "file");
  const hint = readStringProperty(error, "hint");
  if (code) lines.push(`  code: ${code}`);
  if (file) lines.push(`  file: ${file}`);
  if (hint) lines.push(`  hint: ${hint}`);

  const cause = "cause" in error ? error.cause : undefined;
  if (cause !== undefined) lines.push(`Caused by: ${formatError(cause, seen)}`);
  return lines.join("\n");
}

function describe(error: Error): string {
  return error.name && error.name !== "Error"
    ? `${error.name}: ${error.message}`
    : error.message;
}

function readStringProperty(error: Error, key: string): string | undefined {
  const value = (error as unknown as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
