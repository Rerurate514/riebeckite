export const MAX_SOURCE_LENGTH = 4_096;

export const MAX_TOKENS = 512;

export const targetPattern = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;

export const forbiddenTargetParts = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export function bracketBody(source: string, prefix: string) {
  if (!source.startsWith(prefix)) throw new Error("Invalid field.");
  let depth = 1;
  for (let index = prefix.length; index < source.length; index += 1) {
    if (source[index] === "[") depth += 1;
    if (source[index] === "]") depth -= 1;
    if (depth === 0)
      return { value: source.slice(prefix.length, index), end: index + 1 };
  }
  throw new Error("Unclosed bracket.");
}

export function splitArguments(source: string): string[] {
  const values: string[] = [];
  let quote = false;
  let depth = 0;
  let start = 0;
  for (let index = 0; index <= source.length; index += 1) {
    const char = source[index];
    if (char === "'" && source[index - 1] !== "\\") quote = !quote;
    if (!quote && char === "(") depth += 1;
    if (!quote && char === ")") depth -= 1;
    if ((char === "," && !quote && depth === 0) || index === source.length) {
      values.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (quote || depth !== 0 || values.some((value) => value === ""))
    throw new Error("Invalid input arguments.");
  return values;
}
