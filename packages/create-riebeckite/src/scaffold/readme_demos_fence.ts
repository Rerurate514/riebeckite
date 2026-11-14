export function fence(language: string, body: string): string {
  const tick = "```";
  return `${tick}${language}\n${body}\n${tick}`;
}
