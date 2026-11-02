import assert from "node:assert/strict";
import { test } from "node:test";
import { createDerivedViewRegistry } from "@riebeckite/core";
import { dateKey, vaultActivityView } from "../src/activity.ts";

const fields = {
  created: ["created", "date", "published"],
  modified: ["modified", "updated"],
};

test("dateKey reads calendar dates and rejects invalid values", () => {
  assert.equal(dateKey("2026-11-01"), "2026-11-01");
  assert.equal(dateKey("2026-11-01T12:00:00Z"), "2026-11-01");
  assert.equal(dateKey(new Date("2026-02-03T00:00:00Z")), "2026-02-03");
  assert.equal(dateKey("2026-02-30"), null);
  assert.equal(dateKey("not a date"), null);
  assert.equal(dateKey(undefined), null);
});

test("aggregates created and modified dates per day", async () => {
  const derived = createDerivedViewRegistry();
  derived.register(vaultActivityView);

  const resolution = await derived.resolveWithDependencies(vaultActivityView, {
    fields,
    entries: [
      {
        slug: "one",
        dates: { created: "2026-01-02", modified: "2026-01-03" },
      },
      {
        slug: "two",
        dates: { created: "2026-01-02", updated: "2026-01-02" },
      },
      { slug: "three", dates: { created: "not-a-date" } },
    ],
  });

  assert.deepEqual(resolution.value, {
    earliest: "2026-01-02",
    latest: "2026-01-03",
    total: 4,
    activeDays: 2,
    days: {
      "2026-01-02": { created: 2, modified: 1 },
      "2026-01-03": { created: 0, modified: 1 },
    },
  });
});

test("falls back to date and published when created is absent", async () => {
  const derived = createDerivedViewRegistry();
  derived.register(vaultActivityView);

  const resolution = await derived.resolveWithDependencies(vaultActivityView, {
    fields,
    entries: [
      { slug: "date", dates: { date: "2026-05-01" } },
      { slug: "published", dates: { published: "2026-05-02" } },
      {
        slug: "both",
        dates: { date: "2026-05-03", published: "2026-05-04" },
      },
    ],
  });

  assert.deepEqual(resolution.value.days, {
    "2026-05-01": { created: 1, modified: 0 },
    "2026-05-02": { created: 1, modified: 0 },
    "2026-05-03": { created: 1, modified: 0 },
  });
});

test("prefers modified over updated and reports empty activity", async () => {
  const derived = createDerivedViewRegistry();
  derived.register(vaultActivityView);

  const dated = await derived.resolveWithDependencies(vaultActivityView, {
    fields,
    entries: [
      {
        slug: "note",
        dates: {
          modified: "2026-04-01",
          updated: "2026-04-02",
        },
      },
    ],
  });
  assert.deepEqual(dated.value.days, {
    "2026-04-01": { created: 0, modified: 1 },
  });

  const empty = await derived.resolveWithDependencies(vaultActivityView, {
    fields,
    entries: [],
  });
  assert.deepEqual(empty.value, {
    earliest: null,
    latest: null,
    total: 0,
    activeDays: 0,
    days: {},
  });
});

test("uses configured fields in fallback order", async () => {
  const derived = createDerivedViewRegistry();
  derived.register(vaultActivityView);

  const resolution = await derived.resolveWithDependencies(vaultActivityView, {
    fields: { created: ["posted", "created"], modified: [] },
    entries: [
      {
        slug: "one",
        dates: { created: "2026-06-01", posted: "2026-06-02" },
      },
      { slug: "two", dates: { updated: "2026-06-03" } },
    ],
  });

  assert.deepEqual(resolution.value.days, {
    "2026-06-02": { created: 1, modified: 0 },
  });
});
