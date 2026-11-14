import crypto from "node:crypto";

export function matchesToken(
  provided: string | string[] | undefined,
  expected: string,
): boolean {
  if (typeof provided !== "string") return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return (
    providedBytes.length === expectedBytes.length &&
    crypto.timingSafeEqual(providedBytes, expectedBytes)
  );
}
