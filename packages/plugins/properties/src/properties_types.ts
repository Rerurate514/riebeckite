import type {
  PropertiesRenderContext,
  ResolvedPropertiesOptions,
} from "./types.js";

export const MAX_DEPTH = 6;

export type ConversionState = {
  readonly options: ResolvedPropertiesOptions;
  readonly context: PropertiesRenderContext;
};
