import assert from "node:assert/strict";
import { test } from "node:test";
import { renderVaultHeatmap, VAULT_HEATMAP_CLASS } from "../src/render.ts";
import type { VaultActivity, VaultHeatmapSpec } from "../src/types.ts";

const activity: VaultActivity = {
  earliest: "2026-11-01",
  latest: "2026-11-01",
  total: 4,
  activeDays: 1,
  days: {
    "2026-11-01": { created: 4, modified: 0 },
  },
};

function spec(overrides: Partial<VaultHeatmapSpec> = {}): VaultHeatmapSpec {
  return {
    weeks: 1,
    title: "Vault activity",
    weekStart: "sunday",
    ...overrides,
  };
}

test("renders an empty state when no dated activity exists", () => {
  const html = renderVaultHeatmap(spec(), {
    ...activity,
    earliest: null,
    latest: null,
    total: 0,
    activeDays: 0,
    days: {},
  });

  assert.ok(html.includes(`${VAULT_HEATMAP_CLASS}__empty`));
  assert.ok(html.includes("No dated vault activity."));
});

test("renders the requested window and scales levels", () => {
  const html = renderVaultHeatmap(spec({ end: "2026-11-01" }), activity);

  assert.ok(html.includes('data-level="4" data-date="2026-11-01"'));
  assert.ok(
    html.includes('data-level="0" data-date="2026-11-02" data-future="true"'),
  );
  assert.ok(html.includes("2026-11-01 to 2026-11-07"));
  assert.equal(html.split(`${VAULT_HEATMAP_CLASS}__week`).length - 1, 1);
  assert.equal(html.split(`${VAULT_HEATMAP_CLASS}__day`).length - 1, 12);
});

test("aligns monday weeks and uses the latest activity when end is absent", () => {
  const html = renderVaultHeatmap(
    spec({ weekStart: "monday", weeks: 2 }),
    activity,
  );

  assert.ok(html.includes("2026-10-19 to 2026-11-01"));
  assert.ok(html.includes('aria-label="Vault activity: 4 updates on 1 day'));
});

test("escapes the title and empty activity values", () => {
  const html = renderVaultHeatmap(
    spec({ title: '<script>alert("x")</script>' }),
    {
      ...activity,
      days: { "2026-11-01": { created: 1, modified: 0 } },
    },
  );

  assert.ok(html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("1 update on 1 day"));
});
