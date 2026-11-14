export function escapeWikilinkAliasPipesInTables(markdown: string): string {
  const lines = markdown.split("\n");
  let inCodeFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/^\s*(?:`{3,}|~{3,})/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (
      inCodeFence ||
      !isTableDelimiter(line) ||
      index === 0 ||
      !lines[index - 1]?.includes("|")
    ) {
      continue;
    }

    lines[index - 1] = escapeWikilinkAliasPipes(lines[index - 1] ?? "");
    for (let row = index + 1; lines[row]?.includes("|"); row += 1) {
      lines[row] = escapeWikilinkAliasPipes(lines[row] ?? "");
    }
  }

  return lines.join("\n");
}

export function isTableDelimiter(line: string): boolean {
  return (
    line.includes("|") &&
    /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/.test(line)
  );
}

export function escapeWikilinkAliasPipes(line: string): string {
  return line.replace(
    /(!?\[\[[^\]\r\n]*?)\|([^\]\r\n]*\]\])/g,
    (match, prefix: string, suffix: string) =>
      prefix.endsWith("\\") ? match : `${prefix}\\|${suffix}`,
  );
}
