/** Returns the first occurrence of each string, preserving input order. */
export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}
