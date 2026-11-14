import type { ConversionState } from "./properties_types.js";
import type { PropertiesFieldConfig, PropertyValue } from "./types.js";

export type NestedConverter = (
  value: unknown,
  key: string,
  field: PropertiesFieldConfig | undefined,
  state: ConversionState,
  depth: number,
) => PropertyValue;

let convertNestedImpl: NestedConverter | undefined;

export function setNestedConverter(next: NestedConverter): void {
  convertNestedImpl = next;
}

export const convertNested: NestedConverter = (
  value,
  key,
  field,
  state,
  depth,
) => {
  if (!convertNestedImpl) return { kind: "text", text: String(value) };
  return convertNestedImpl(value, key, field, state, depth);
};
