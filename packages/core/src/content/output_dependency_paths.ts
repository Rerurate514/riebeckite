export function normalizePublicPath(pathname: string): string {
  const path = `/${pathname
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .join("/")}`;
  return path === "/" ? path : path.replace(/\/$/, "");
}

export function htmlOutputPath(pathname: string): string {
  const normalized = normalizePublicPath(pathname).replace(/\.html$/i, "");
  if (normalized === "/") return "index.html";
  const withoutSlash = normalized.replace(/^\//, "");
  if (pathname.replaceAll("\\", "/").endsWith("/"))
    return `${withoutSlash}/index.html`;
  return `${withoutSlash}.html`;
}
