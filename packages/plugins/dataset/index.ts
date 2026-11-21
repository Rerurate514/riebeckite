import { definePlugin } from "@riebeckite/core";
import {
  buildDatasetOutputs,
  type DatasetPluginOptions,
  resolveDatasetDirectory,
  validateDatasetOptions,
} from "./src/dataset.js";

export type {
  DatasetIndex,
  DatasetLink,
  DatasetPage,
  DatasetPluginOptions,
} from "./src/dataset.js";
export {
  buildDatasetIndex,
  buildDatasetLinks,
  buildDatasetOutputs,
  buildDatasetPages,
  DATASET_GENERATOR,
  DATASET_SCHEMA_VERSION,
  DEFAULT_DATASET_DIRECTORY,
  resolveDatasetDirectory,
  toNdjson,
  validateDatasetOptions,
} from "./src/dataset.js";

export function dataset(options: DatasetPluginOptions = {}) {
  const directory = resolveDatasetDirectory(options.directory);
  return definePlugin({
    name: "dataset",
    options,
    validateOptions: validateDatasetOptions,
    planGeneratedOutputs: ({ manifest }) =>
      buildDatasetOutputs(manifest.discoverableEntries, directory),
  });
}
