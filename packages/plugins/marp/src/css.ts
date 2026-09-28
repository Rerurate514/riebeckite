const PRINT_GLOBAL_SELECTOR = "html, body";

/**
 * Scopes Marp Core's generated CSS so it can be inlined anywhere on a page
 * without leaking.
 *
 * Marp renders every structural rule under the deck container class (set via
 * the `container` Marp option), so the only globals left to fix are the
 * `@page` rule and the `html, body` selector inside `@media print`. The deck
 * container is additionally required to sit inside the wrapper class.
 */
export function scopeMarpCss(
  css: string,
  wrapperClass: string,
  deckClass: string,
): string {
  const containerSelector = `div.${deckClass}`;
  const wrapperSelector = `.${wrapperClass}`;
  const scoped = css
    .split(containerSelector)
    .join(`${wrapperSelector} ${containerSelector}`)
    .split(PRINT_GLOBAL_SELECTOR)
    .join(wrapperSelector);
  return removeAtRule(scoped, "@page");
}

function removeAtRule(css: string, atRuleName: string): string {
  const start = css.indexOf(atRuleName);
  if (start === -1) return css;

  const brace = css.indexOf("{", start);
  if (brace === -1) return css;

  let depth = 0;
  let end = brace;
  for (; end < css.length; end += 1) {
    if (css[end] === "{") depth += 1;
    else if (css[end] === "}") {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }

  return `${css.slice(0, start)}${css.slice(end)}`;
}
