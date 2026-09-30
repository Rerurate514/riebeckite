/**
 * Shared unit-test utilities for Riebeckite packages.
 *
 * This entry point stays dependency-free and platform-neutral so any package
 * can use it in its own `test/*.test.ts` without pulling in build tooling.
 *
 * The external-consumer end-to-end engine lives in the separate
 * `@riebeckite/test/e2e` entry point because it orchestrates processes, the
 * filesystem, and published tarballs.
 */
export {
  assertGolden,
  assertGoldenJson,
  type GoldenOptions,
} from "./golden.js";
