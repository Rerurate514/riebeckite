import assert from "node:assert/strict";
import test from "node:test";
import { buildCanvasLayout, parseCanvas } from "../index.js";

test("canvas edges attach to their declared sides and preserve arrow ends", () => {
  const document = parseCanvas(
    JSON.stringify({
      nodes: [
        { id: "start", type: "text", x: 0, y: 0, width: 100, height: 80 },
        { id: "end", type: "text", x: 240, y: 0, width: 100, height: 80 },
      ],
      edges: [
        {
          id: "flow",
          fromNode: "start",
          fromSide: "right",
          fromEnd: "none",
          toNode: "end",
          toSide: "left",
          toEnd: "arrow",
        },
      ],
    }),
  );

  assert.ok(document);
  const [edge] = buildCanvasLayout(document).edges;
  assert.deepEqual(edge, {
    id: "flow",
    fromNode: "start",
    fromSide: "right",
    fromEnd: "none",
    toNode: "end",
    toSide: "left",
    toEnd: "arrow",
    color: undefined,
    label: undefined,
    x1: 100,
    y1: 40,
    x2: 240,
    y2: 40,
  });
});
