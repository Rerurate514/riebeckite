import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveEntryCalendarDate,
  resolveEntryDate,
  toCalendarDate,
} from "../index.js";

test("resolveEntryDate skips values that are not valid dates", () => {
  assert.equal(
    resolveEntryDate({ published: true, date: "2024-01-02" }),
    "2024-01-02T00:00:00.000Z",
  );
  assert.equal(
    resolveEntryDate({ published: "", date: "2024-02-03" }),
    "2024-02-03T00:00:00.000Z",
  );
  assert.equal(
    resolveEntryDate({ date: "not-a-date", created: "2024-03-04" }),
    "2024-03-04T00:00:00.000Z",
  );
  assert.equal(resolveEntryDate({ published: true }), null);
});

test("toCalendarDate keeps the authored calendar date", () => {
  assert.equal(toCalendarDate("2026-11-11T08:00:00+09:00"), "2026-11-11");
  assert.equal(toCalendarDate("2026-11-11T23:30:00-05:00"), "2026-11-11");
  assert.equal(toCalendarDate("2026-11-11"), "2026-11-11");
  assert.equal(toCalendarDate("not-a-date"), null);
});

test("resolveEntryCalendarDate skips values that are not valid dates", () => {
  assert.equal(
    resolveEntryCalendarDate({
      published: true,
      date: "2026-11-11T08:00:00+09:00",
    }),
    "2026-11-11",
  );
  assert.equal(resolveEntryCalendarDate({ published: true }), null);
});
