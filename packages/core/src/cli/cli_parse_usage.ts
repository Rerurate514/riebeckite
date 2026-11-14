export const ROOT_USAGE = "Usage: riebeckite <command> [options]";

export function suggest(
  value: string,
  candidates: readonly string[],
): string[] {
  return candidates
    .map((candidate) => ({
      candidate,
      distance: editDistance(value.toLowerCase(), candidate.toLowerCase()),
      prefix:
        candidate.toLowerCase().startsWith(value.toLowerCase()) ||
        value.toLowerCase().startsWith(candidate.toLowerCase()),
    }))
    .filter(
      (entry) =>
        entry.prefix ||
        entry.distance <= Math.max(2, Math.ceil(value.length / 3)),
    )
    .sort((left, right) => {
      if (left.prefix !== right.prefix) return left.prefix ? -1 : 1;
      return left.distance - right.distance;
    })
    .slice(0, 5)
    .map((entry) => entry.candidate);
}

export function editDistance(left: string, right: string): number {
  if (left === right) return 0;
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex] ?? 0;
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previous[rightIndex] = Math.min(
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + 1,
        diagonal + cost,
      );
      diagonal = above;
    }
  }
  return previous[right.length] ?? left.length;
}
