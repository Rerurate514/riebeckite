import { defineDerivedView } from "@riebeckite/core";
import type {
  VaultActivity,
  VaultActivityDay,
  VaultHeatmapInput,
} from "./types.js";

export const VAULT_HEATMAP_VIEW_ID = "vault-heatmap.activity";

export const vaultActivityView = defineDerivedView<
  VaultHeatmapInput,
  VaultActivity
>({
  id: VAULT_HEATMAP_VIEW_ID,
  version: "vault-heatmap-v1",
  compute(input, context) {
    const days = new Map<string, { created: number; modified: number }>();

    for (const entry of input.entries) {
      context.track({ type: "content", id: entry.slug });
      context.track({
        type: "frontmatter",
        id: entry.slug,
        property: "created",
      });
      context.track({
        type: "frontmatter",
        id: entry.slug,
        property: "modified",
      });
      context.track({
        type: "frontmatter",
        id: entry.slug,
        property: "updated",
      });

      const created = dateKey(entry.created);
      const modified = dateKey(entry.modified) ?? dateKey(entry.updated);
      if (created) increment(days, created, "created");
      if (modified) increment(days, modified, "modified");
    }

    const keys = [...days.keys()].sort();
    const record: Record<string, VaultActivityDay> = {};
    let total = 0;
    for (const key of keys) {
      const day = days.get(key);
      if (!day) continue;
      record[key] = { created: day.created, modified: day.modified };
      total += day.created + day.modified;
    }

    return {
      earliest: keys[0] ?? null,
      latest: keys[keys.length - 1] ?? null,
      total,
      activeDays: keys.length,
      days: record,
    };
  },
});

export function dateKey(value: unknown): string | null {
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s]|$)/.exec(value.trim());
    if (!match) return null;
    return validDateKey(match[1], match[2], match[3]);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}

function validDateKey(year: string, month: string, day: string): string | null {
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

function increment(
  days: Map<string, { created: number; modified: number }>,
  key: string,
  field: "created" | "modified",
): void {
  const day = days.get(key) ?? { created: 0, modified: 0 };
  day[field] += 1;
  days.set(key, day);
}
