import assert from "node:assert/strict";
import { test } from "node:test";
import {
  IMAGE_COMPARE_CLASS,
  renderImageCompare,
  renderImageCompareError,
} from "../index.ts";

const spec = {
  before: "/before.png",
  after: "/after.png",
  beforeAlt: "Before <state>",
  afterAlt: "After",
  orientation: "horizontal" as const,
};

test("renders a static fallback and the comparison stage", () => {
  const html = renderImageCompare(spec);

  assert.ok(html.includes("data-rr-image-compare"));
  assert.ok(html.includes('data-orientation="horizontal"'));
  assert.ok(html.includes('class="rr-image-compare__static"'));
  assert.ok(html.includes('class="rr-image-compare__stage"'));
  assert.ok(
    html.includes(
      'class="rr-image-compare__image rr-image-compare__image--before"',
    ),
  );
  assert.ok(
    html.includes(
      'class="rr-image-compare__layer"><img class="rr-image-compare__image rr-image-compare__image--after"',
    ),
  );
  assert.ok(html.includes('type="range"'));
  assert.ok(html.includes('min="0" max="100" value="50"'));
  assert.ok(html.includes("data-image-compare-range"));
  assert.ok(html.includes("--rr-image-compare-position:50%"));
});

test("escapes alt text and labels", () => {
  const html = renderImageCompare({
    ...spec,
    beforeAlt: 'Before "quoted" <script>',
    label: "A <label>",
  });

  assert.ok(html.includes('alt="Before &quot;quoted&quot; &lt;script&gt;"'));
  assert.ok(html.includes("A &lt;label&gt;"));
  assert.ok(!html.includes("<script>"));
});

test("renders a vertical orientation", () => {
  const html = renderImageCompare({ ...spec, orientation: "vertical" });
  assert.ok(html.includes('data-orientation="vertical"'));
});

test("renders a readable error", () => {
  const html = renderImageCompareError("Unsupported image <x>.");
  assert.equal(
    html,
    `<div class="${IMAGE_COMPARE_CLASS} ${IMAGE_COMPARE_CLASS}--error" role="status">Unsupported image &lt;x&gt;.</div>`,
  );
});
