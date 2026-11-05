import assert from "node:assert/strict";
import test from "node:test";
import { buildCanvasLayout, parseCanvas } from "../index.js";

test("canvas edges attach to their declared sides and preserve arrow ends", () => {
  const document = parseCanvas(
    JSON.stringify({
      nodes: [
        {
          id: "start",
          type: "text",
          x: 0,
          y: 0,
          width: 100,
          height: 80,
          text: "Start",
        },
        {
          id: "end",
          type: "text",
          x: 240,
          y: 0,
          width: 100,
          height: 80,
          text: "End",
        },
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

test("canvas preserves negative coordinates and JSON Canvas edge defaults", () => {
  const document = parseCanvas(
    JSON.stringify({
      nodes: [
        {
          id: "left",
          type: "text",
          x: -100,
          y: -20,
          width: 80,
          height: 40,
          text: "Left",
        },
        {
          id: "right",
          type: "text",
          x: 100,
          y: 20,
          width: 80,
          height: 40,
          text: "Right",
        },
      ],
      edges: [{ id: "edge", fromNode: "left", toNode: "right" }],
    }),
  );

  assert.ok(document);
  const layout = buildCanvasLayout(document);
  assert.equal(layout.nodes[0]?.x, 0);
  assert.equal(layout.nodes[0]?.y, 0);
  assert.equal(layout.width, 280);
  assert.equal(layout.height, 80);
  assert.equal(layout.edges[0]?.fromEnd, "none");
  assert.equal(layout.edges[0]?.toEnd, "arrow");
});

test("canvas rejects malformed required nodes and duplicate IDs", () => {
  assert.equal(
    parseCanvas('{"nodes":[{"id":"a","type":"text"}],"edges":[]}'),
    null,
  );
  assert.equal(
    parseCanvas(
      '{"nodes":[{"id":"a","type":"text","x":0,"y":0,"width":1,"height":1,"text":"a"},{"id":"a","type":"text","x":0,"y":0,"width":1,"height":1,"text":"b"}],"edges":[]}',
    ),
    null,
  );
});
