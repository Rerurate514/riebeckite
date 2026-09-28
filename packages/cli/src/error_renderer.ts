export function renderCliError(error: unknown): string {
  return formatError(error, new Set());
}

function formatError(error: unknown, seen: Set<unknown>): string {
  if (!(error instanceof Error)) return String(error);
  if (seen.has(error)) return error.message;

  seen.add(error);
  const cause = "cause" in error ? error.cause : undefined;
  return cause === undefined
    ? error.message
    : `${error.message}\nCaused by: ${formatError(cause, seen)}`;
}
