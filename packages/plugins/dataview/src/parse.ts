import { parseSpec } from "./dataview_parse_spec.js";
import { DataviewParseError } from "./parse-shared.js";
import type { DataviewParseResult } from "./types.js";

export { parseExpression } from "./dataview_parse_expression.js";
export { DataviewParseError } from "./parse-shared.js";

export function parseDataview(source: string): DataviewParseResult {
  try {
    return { status: "ok", spec: parseSpec(source) };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof DataviewParseError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error),
    };
  }
}
