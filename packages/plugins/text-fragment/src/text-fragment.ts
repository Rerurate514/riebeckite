/**
 * Pure helpers for URL Fragment Text Directives.
 *
 * Syntax (WICG scroll-to-text-fragment):
 * `#:~:text=[prefix-,]start[,end][,-suffix]`
 */

const TEXT_FRAGMENT_PREFIX = "#:~:text=";

/** Selections longer than this are shortened to a `start,end` range. */
const MAX_TEXT_FRAGMENT_LENGTH = 200;

const NEWLINE_PATTERN = /\r\n|\r|\n/g;
const NEWLINE_TEST = /[\r\n]/;

export type TextFragmentOptions = {
  /** Text immediately before the selection, used to disambiguate it. */
  prefix?: string;
  /** Text immediately after the selection, used to disambiguate it. */
  suffix?: string;
};

/**
 * Percent-encodes a text fragment term.
 *
 * `,` `-` and `&` are reserved by the text directive grammar and are always
 * encoded (`%2C`, `%2D`, `%26`). Everything else is encoded per UTF-8, so
 * multibyte characters (Japanese, emoji) survive the round trip and newlines
 * become `%0A`.
 */
export function encodeTextFragment(text: string): string {
  let encoded: string;

  try {
    encoded = encodeURIComponent(text);
  } catch {
    // `encodeURIComponent` throws on lone surrogates. Replace them with the
    // Unicode replacement character so encoding never fails.
    encoded = encodeURIComponent(text.replace(/[\uD800-\uDFFF]/g, "\uFFFD"));
  }

  return encoded
    .replace(/&/g, "%26")
    .replace(/,/g, "%2C")
    .replace(/-/g, "%2D");
}

/**
 * Builds a deep link that highlights `selection` on `pageUrl`.
 *
 * Returns `""` for an empty or whitespace-only selection. Any existing hash on
 * `pageUrl` is dropped before the fragment directive is appended. When the
 * selection is longer than ~200 characters or contains a newline, it is reduced
 * to a `start,end` range built from its first and last token.
 */
export function buildTextFragmentUrl(
  pageUrl: string,
  selection: string,
  options: TextFragmentOptions = {},
): string {
  const directive = buildTextDirective(selection, options);
  if (directive.length === 0) return "";

  return `${stripUrlFragment(pageUrl)}${TEXT_FRAGMENT_PREFIX}${directive}`;
}

/**
 * Builds a Markdown block quote for `selection` followed by a credit line that
 * links to `url`. Every line of the selection is prefixed with `> `.
 */
export function buildQuoteMarkdown(args: {
  url: string;
  title: string;
  selection: string;
}): string {
  const quoted = normalizeNewlines(args.selection)
    .split("\n")
    .map((line) => (line.length > 0 ? `> ${line}` : ">"))
    .join("\n");

  return `${quoted}\n> — [${args.title}](${args.url})`;
}

function buildTextDirective(
  selection: string,
  options: TextFragmentOptions,
): string {
  const normalized = normalizeNewlines(selection).trim();
  if (normalized.length === 0) return "";

  const prefix = normalizeNewlines(options.prefix ?? "").trim();
  const suffix = normalizeNewlines(options.suffix ?? "").trim();

  const useRange =
    normalized.length > MAX_TEXT_FRAGMENT_LENGTH || NEWLINE_TEST.test(selection);

  let match: string;
  if (useRange) {
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const start = tokens[0] ?? normalized;
    const end = tokens.length > 1 ? tokens[tokens.length - 1] : "";

    match =
      end.length > 0
        ? `${encodeTextFragment(start)},${encodeTextFragment(end)}`
        : encodeTextFragment(start);
  } else {
    match = encodeTextFragment(normalized);
  }

  const prefixPart = prefix.length > 0 ? `${encodeTextFragment(prefix)}-,` : "";
  const suffixPart = suffix.length > 0 ? `,-${encodeTextFragment(suffix)}` : "";

  return `${prefixPart}${match}${suffixPart}`;
}

function normalizeNewlines(value: string): string {
  return value.replace(NEWLINE_PATTERN, "\n");
}

function stripUrlFragment(url: string): string {
  const index = url.indexOf("#");
  return index === -1 ? url : url.slice(0, index);
}
