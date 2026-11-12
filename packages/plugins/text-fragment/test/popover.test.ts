import assert from "node:assert/strict";
import test from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import {
  TextFragmentPopover,
  type TextFragmentPopoverProps,
} from "../src/popover.js";

const labels = {
  regionLabel: "Share selected text",
  copyLinkLabel: "Copy link",
  copyQuoteLabel: "Copy quote",
  linkCopiedLabel: "Link copied",
  quoteCopiedLabel: "Quote copied",
  copyFailedLabel: "Could not copy.",
};

const baseProps: TextFragmentPopoverProps = {
  labels,
  visible: false,
  status: "",
  onCopyLink: () => {},
  onCopyQuote: () => {},
};

test("TextFragmentPopover renders a hidden group with action buttons", () => {
  const html = renderToString(TextFragmentPopover(baseProps));
  assert.match(html, /class="rr-text-fragment"/);
  assert.match(html, /role="group"/);
  assert.match(html, /aria-label="Share selected text"/);
  assert.match(
    html,
    /<div class="rr-text-fragment" role="group" aria-label="Share selected text" hidden="">/,
  );
  assert.match(html, /class="rr-text-fragment__actions"/);
  assert.match(
    html,
    /type="button" class="rr-text-fragment__button">Copy link</,
  );
  assert.match(
    html,
    /type="button" class="rr-text-fragment__button">Copy quote</,
  );
  assert.match(
    html,
    /class="rr-text-fragment__status" role="status" aria-live="polite"><\/p>/,
  );
});

test("TextFragmentPopover shows the status and omits hidden when visible", () => {
  const html = renderToString(
    TextFragmentPopover({ ...baseProps, visible: true, status: "Link copied" }),
  );
  assert.doesNotMatch(html, /aria-label="Share selected text" hidden/);
  assert.match(html, />Link copied<\/p>/);
});
