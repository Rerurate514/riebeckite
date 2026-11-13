const ALLOWED_LINK_SCHEMES = new Set(["https:", "http:"]);
const ALLOWED_IMAGE_SCHEMES = new Set(["https:", "http:", "data:image/"]);

export function isSafeLinkUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_LINK_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function isSafeImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(url);
    return ALLOWED_IMAGE_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}
