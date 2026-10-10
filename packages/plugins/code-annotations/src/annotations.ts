export const DIFF_META_PREFIX = "rb-diff=";

export type DiffMarker = "+" | "-" | null;

export type CodeDiffPlan = {
  markers: DiffMarker[];
};

export function collectCodeDiff(code: string): {
  code: string;
  plan: CodeDiffPlan;
} {
  const markers: DiffMarker[] = [];
  const lines = code.split("\n").map((line) => {
    const marker: DiffMarker =
      line.startsWith("+") || line.startsWith("-")
        ? (line[0] as "+" | "-")
        : null;
    markers.push(marker);
    return marker ? line.slice(1) : line;
  });
  return { code: lines.join("\n"), plan: { markers } };
}

export function serializeCodeDiff(plan: CodeDiffPlan): string {
  return JSON.stringify(plan);
}

export function deserializeCodeDiff(value: unknown): CodeDiffPlan | null {
  if (typeof value !== "string" || value === "") return null;
  try {
    const parsed = JSON.parse(value) as { markers?: unknown };
    if (!Array.isArray(parsed.markers)) return null;
    return {
      markers: parsed.markers.map((marker) =>
        marker === "+" || marker === "-" ? marker : null,
      ),
    };
  } catch {
    return null;
  }
}

export function encodeCodeDiffMeta(plan: CodeDiffPlan): string {
  return `${DIFF_META_PREFIX}${encodeURIComponent(serializeCodeDiff(plan))}`;
}

export function extractCodeDiffMeta(
  meta: string | null | undefined,
): CodeDiffPlan | null {
  if (typeof meta !== "string") return null;
  const match = meta.match(/(?:^|\s)rb-diff=([^\s]+)/);
  if (!match) return null;
  try {
    return deserializeCodeDiff(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function appendCodeDiffMeta(
  meta: string | null | undefined,
  plan: CodeDiffPlan,
): string {
  const token = encodeCodeDiffMeta(plan);
  const base = typeof meta === "string" ? meta.trim() : "";
  return base === "" ? token : `${base} ${token}`;
}

export function removeCodeDiffMeta(meta: string | null | undefined): string {
  if (typeof meta !== "string") return "";
  return meta
    .replace(/(?:^|\s)rb-diff=[^\s]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
