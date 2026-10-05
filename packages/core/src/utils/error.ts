export function attachErrorPath<T>(error: T, path: string): T {
  if (
    error instanceof Error &&
    (error as { path?: unknown }).path === undefined
  ) {
    (error as Error & { path?: string }).path = path;
  }
  return error;
}
