import assert from "node:assert/strict";
import test from "node:test";
import { fitBounds, screenToWorld, worldToScreen, zoomAt } from "../index.js";

test("canvas zoom retains the world point under the cursor", () => {
  const camera = { x: 40, y: 20, scale: 0.5 };
  const cursor = { x: 180, y: 120 };
  const world = screenToWorld(cursor, camera);
  const zoomed = zoomAt(camera, 2, cursor);

  assert.deepEqual(worldToScreen(world, zoomed), cursor);
});

test("canvas fit centers a layout and permits very large bounds", () => {
  const camera = fitBounds(
    { width: 100_000, height: 100, nodes: [], edges: [] },
    500,
    300,
  );

  assert.equal(camera.scale, 0.05);
  assert.equal(camera.x, -2250);
  assert.equal(camera.y, 147.5);
});
