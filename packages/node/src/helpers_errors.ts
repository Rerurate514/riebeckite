import { isRecord } from "./helpers_plan.js";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function sanitizeErrorMessage(
  error: unknown,
  contentDirectory: string,
): string {
  return errorMessage(error)
    .split(contentDirectory)
    .join("<content>")
    .replace(/[A-Za-z]:[\\/][^\s'"]+/gu, "<path>");
}

export function errorPath(error: unknown): string | undefined {
  if (!isRecord(error) || typeof error.path !== "string") return undefined;
  const value = error.path.replace(/\\/gu, "/");
  if (value.startsWith("/") || /^[A-Za-z]:\//u.test(value)) return undefined;
  return value;
}

export async function retryOnSharingViolation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (
        attempt >= 5 ||
        (code !== "EPERM" && code !== "EBUSY" && code !== "EACCES")
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
    }
  }
}
