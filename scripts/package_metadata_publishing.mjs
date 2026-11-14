import { supportedNodeEngines } from "./package_metadata_base.mjs";
import { PUBLISHING_METADATA_A } from "./package_metadata_publishing_a.mjs";
import { PUBLISHING_METADATA_B } from "./package_metadata_publishing_b.mjs";
import { PUBLISHING_METADATA_C } from "./package_metadata_publishing_c.mjs";

const packagePublishingMetadata = {
  ...PUBLISHING_METADATA_A,
  ...PUBLISHING_METADATA_B,
  ...PUBLISHING_METADATA_C,
};

export function publishingMetadata(directory, sideEffects) {
  const metadata = packagePublishingMetadata[directory];
  if (!metadata)
    throw new Error(`Missing publishing metadata for ${directory}`);
  return { ...metadata, engines: supportedNodeEngines, sideEffects };
}
