import { expectedGroupPackageMetadata } from "./package_metadata_expected_groups.mjs";
import { expectedFixedPackageMetadata } from "./package_metadata_expected_packages.mjs";

export function expectedPackageMetadata(directory) {
  const fixed = expectedFixedPackageMetadata(directory);
  if (fixed) return fixed;
  return expectedGroupPackageMetadata(directory);
}
