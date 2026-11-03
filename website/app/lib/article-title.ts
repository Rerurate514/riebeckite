export function getArticleTitle(slug: string, title: unknown): string {
  if (typeof title === "string" && title.trim().length > 0) return title;

  return slug.split("/").at(-1) ?? slug;
}
