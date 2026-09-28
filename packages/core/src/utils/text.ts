/** Removes HTML tags and non-visible script/style content from a string. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

/** Estimates reading time using CJK characters and Latin words. */
export function calculateReadingTime(html: string): number {
  const text = stripHtml(html).trim();
  if (!text) return 1;

  const cjkCharacters =
    text.match(/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/gu)
      ?.length ?? 0;
  const latinWords =
    text
      .replace(/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/gu, " ")
      .match(/[\p{L}\p{N}]+/gu)?.length ?? 0;

  return Math.max(1, Math.ceil(cjkCharacters / 500 + latinWords / 220));
}
