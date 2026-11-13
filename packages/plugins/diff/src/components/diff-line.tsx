/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

import { renderToString } from "hono/jsx/dom/server";
import type { PostDiff } from "../types.js";
import { DiffLine } from "./diff-panel.js";

type DiffLineProps = {
  line: PostDiff["lines"][number];
};

export function renderDiffLine({ line }: DiffLineProps): string {
  return renderToString(<DiffLine line={line} />);
}
